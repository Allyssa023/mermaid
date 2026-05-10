package com.mermaid.app.controller;

import com.mermaid.app.api.FishermanProfileApi;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.FishermanProfile;
import com.mermaid.app.model.FishermanProfileUpdateRequest;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class FishermanProfileController implements FishermanProfileApi {

    private final UserRepository userRepo;

    public FishermanProfileController(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    public ResponseEntity<FishermanProfile> getFishermanProfile() {
        Long fid = SecurityUtils.currentUserId();
        User user = userRepo.findById(fid)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(toProfile(user));
    }

    @Override
    public ResponseEntity<FishermanProfile> updateFishermanProfile(FishermanProfileUpdateRequest req) {
        Long fid = SecurityUtils.currentUserId();
        User user = userRepo.findById(fid)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (req.getVesselName() != null && req.getVesselName().isPresent())
            user.setVesselName(req.getVesselName().get());
        if (req.getLandingSite() != null && req.getLandingSite().isPresent())
            user.setLandingSite(req.getLandingSite().get());
        if (req.getEmergencyContactName() != null && req.getEmergencyContactName().isPresent())
            user.setEmergencyContactName(req.getEmergencyContactName().get());
        if (req.getEmergencyContactPhone() != null && req.getEmergencyContactPhone().isPresent())
            user.setEmergencyContactPhone(req.getEmergencyContactPhone().get());
        if (req.getGcashNumber() != null && req.getGcashNumber().isPresent())
            user.setGcashNumber(req.getGcashNumber().get());
        if (req.getMayaNumber() != null && req.getMayaNumber().isPresent())
            user.setMayaNumber(req.getMayaNumber().get());
        userRepo.save(user);
        return ResponseEntity.ok(toProfile(user));
    }

    private FishermanProfile toProfile(User user) {
        FishermanProfile p = new FishermanProfile();
        p.setFullName(user.getFullName());
        p.setEmail(user.getEmail());
        p.setVesselName(JsonNullable.of(user.getVesselName()));
        p.setLandingSite(JsonNullable.of(user.getLandingSite()));
        p.setEmergencyContactName(JsonNullable.of(user.getEmergencyContactName()));
        p.setEmergencyContactPhone(JsonNullable.of(user.getEmergencyContactPhone()));
        p.setGcashNumber(JsonNullable.of(user.getGcashNumber()));
        p.setMayaNumber(JsonNullable.of(user.getMayaNumber()));
        return p;
    }
}
