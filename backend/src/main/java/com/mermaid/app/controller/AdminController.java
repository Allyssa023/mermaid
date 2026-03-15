package com.mermaid.app.controller;

import com.mermaid.app.api.AdminApi;
import com.mermaid.app.model.*;
import com.mermaid.app.service.AdminUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin API implementation. All endpoints require ROLE_ADMIN (least privilege).
 * User management is implemented; other admin features (advisories, reference data) are stubbed for later.
 */
@RestController
@PreAuthorize("hasRole('ADMIN')")
public class AdminController implements AdminApi {

    private final AdminUserService adminUserService;

    public AdminController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @Override
    public ResponseEntity<UserSummary> adminCreateUser(UserCreateRequest userCreateRequest) {
        UserSummary created = adminUserService.createUser(userCreateRequest);
        return ResponseEntity.status(201).body(created);
    }

    @Override
    public ResponseEntity<UserSummary> adminGetUser(Long userId) {
        UserSummary user = adminUserService.getUser(userId);
        return ResponseEntity.ok(user);
    }

    @Override
    public ResponseEntity<List<UserSummary>> adminListUsers() {
        List<UserSummary> list = adminUserService.listUsers();
        return ResponseEntity.ok(list);
    }

    @Override
    public ResponseEntity<UserSummary> adminUpdateUser(Long userId, UserUpdateRequest userUpdateRequest) {
        UserSummary updated = adminUserService.updateUser(userId, userUpdateRequest);
        return ResponseEntity.ok(updated);
    }

    // --- Stubbed (not yet implemented) ---

    @Override
    public ResponseEntity<Advisory> adminCreateAdvisory(AdvisoryCreateRequest advisoryCreateRequest) {
        throw new UnsupportedOperationException("Advisory CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<FishSpecies> adminCreateFishSpecies(FishSpeciesCreateRequest fishSpeciesCreateRequest) {
        throw new UnsupportedOperationException("Fish species CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<MarketLocation> adminCreateMarketLocation(MarketLocationCreateRequest marketLocationCreateRequest) {
        throw new UnsupportedOperationException("Market location CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<Void> adminDeleteAdvisory(Long advisoryId) {
        throw new UnsupportedOperationException("Advisory CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<Void> adminDeleteFishSpecies(Long speciesId) {
        throw new UnsupportedOperationException("Fish species CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<Void> adminDeleteMarketLocation(Long locationId) {
        throw new UnsupportedOperationException("Market location CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<Advisory> adminGetAdvisoryById(Long advisoryId) {
        throw new UnsupportedOperationException("Advisory CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<List<Advisory>> adminListAdvisories() {
        throw new UnsupportedOperationException("Advisory CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<Advisory> adminUpdateAdvisory(Long advisoryId, AdvisoryUpdateRequest advisoryUpdateRequest) {
        throw new UnsupportedOperationException("Advisory CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<FishSpecies> adminUpdateFishSpecies(Long speciesId, FishSpeciesCreateRequest fishSpeciesCreateRequest) {
        throw new UnsupportedOperationException("Fish species CRUD not implemented yet");
    }

    @Override
    public ResponseEntity<MarketLocation> adminUpdateMarketLocation(Long locationId, MarketLocationCreateRequest marketLocationCreateRequest) {
        throw new UnsupportedOperationException("Market location CRUD not implemented yet");
    }
}
