package com.mermaid.app.controller;

import com.mermaid.app.model.BuyerProfile;
import com.mermaid.app.model.BuyerProfileUpdateRequest;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BuyerProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerProfileController {

    private final BuyerProfileService profileService;

    public BuyerProfileController(BuyerProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/buyer/profile")
    public ResponseEntity<BuyerProfile> getProfile() {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(profileService.getProfile(buyerId));
    }

    @PatchMapping("/buyer/profile")
    public ResponseEntity<BuyerProfile> updateProfile(@RequestBody BuyerProfileUpdateRequest request) {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(profileService.updateProfile(buyerId, request));
    }
}
