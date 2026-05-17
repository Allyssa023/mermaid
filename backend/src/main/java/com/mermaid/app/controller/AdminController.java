package com.mermaid.app.controller;

import com.mermaid.app.api.AdminApi;
import com.mermaid.app.domain.Order;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.BuyerOrderMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.AdminUserService;
import com.mermaid.app.service.AdvisoryService;
import com.mermaid.app.service.FishSpeciesService;
import com.mermaid.app.service.MarketLocationService;
import com.mermaid.app.service.OrderTimelineService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@PreAuthorize("hasRole('ADMIN')")
public class AdminController implements AdminApi {

    private final AdminUserService adminUserService;
    private final AdvisoryService advisoryService;
    private final FishSpeciesService fishSpeciesService;
    private final MarketLocationService marketLocationService;
    private final OrderRepository orderRepo;
    private final OrderTimelineService timelineService;
    private final BuyerOrderMapper buyerOrderMapper;

    public AdminController(AdminUserService adminUserService,
                           AdvisoryService advisoryService,
                           FishSpeciesService fishSpeciesService,
                           MarketLocationService marketLocationService,
                           OrderRepository orderRepo,
                           OrderTimelineService timelineService,
                           BuyerOrderMapper buyerOrderMapper) {
        this.adminUserService = adminUserService;
        this.advisoryService = advisoryService;
        this.fishSpeciesService = fishSpeciesService;
        this.marketLocationService = marketLocationService;
        this.orderRepo = orderRepo;
        this.timelineService = timelineService;
        this.buyerOrderMapper = buyerOrderMapper;
    }

    // --- User management (existing) ---

    @Override
    public ResponseEntity<UserSummary> adminCreateUser(UserCreateRequest request) {
        return ResponseEntity.status(201).body(adminUserService.createUser(request));
    }

    @Override
    public ResponseEntity<UserSummary> adminGetUser(Long userId) {
        return ResponseEntity.ok(adminUserService.getUser(userId));
    }

    @Override
    public ResponseEntity<List<UserSummary>> adminListUsers() {
        return ResponseEntity.ok(adminUserService.listUsers());
    }

    @Override
    public ResponseEntity<UserSummary> adminUpdateUser(Long userId, UserUpdateRequest request) {
        return ResponseEntity.ok(adminUserService.updateUser(userId, request));
    }

    // --- Advisory CRUD ---

    @Override
    public ResponseEntity<List<Advisory>> adminListAdvisories() {
        return ResponseEntity.ok(advisoryService.listAll());
    }

    @Override
    public ResponseEntity<Advisory> adminGetAdvisoryById(Long advisoryId) {
        return ResponseEntity.ok(advisoryService.getById(advisoryId));
    }

    @Override
    public ResponseEntity<Advisory> adminCreateAdvisory(AdvisoryCreateRequest request) {
        Long adminUserId = SecurityUtils.currentUserId();
        return ResponseEntity.status(201).body(advisoryService.create(request, adminUserId));
    }

    @Override
    public ResponseEntity<Advisory> adminUpdateAdvisory(Long advisoryId, AdvisoryUpdateRequest request) {
        return ResponseEntity.ok(advisoryService.update(advisoryId, request));
    }

    @Override
    public ResponseEntity<Void> adminDeleteAdvisory(Long advisoryId) {
        advisoryService.delete(advisoryId);
        return ResponseEntity.noContent().build();
    }

    // --- Fish species CRUD ---

    @Override
    public ResponseEntity<FishSpecies> adminCreateFishSpecies(FishSpeciesCreateRequest request) {
        return ResponseEntity.status(201).body(fishSpeciesService.create(request));
    }

    @Override
    public ResponseEntity<FishSpecies> adminUpdateFishSpecies(Long speciesId, FishSpeciesCreateRequest request) {
        return ResponseEntity.ok(fishSpeciesService.update(speciesId, request));
    }

    @Override
    public ResponseEntity<Void> adminDeleteFishSpecies(Long speciesId) {
        fishSpeciesService.delete(speciesId);
        return ResponseEntity.noContent().build();
    }

    // --- Market location CRUD ---

    @Override
    public ResponseEntity<MarketLocation> adminCreateMarketLocation(MarketLocationCreateRequest request) {
        return ResponseEntity.status(201).body(marketLocationService.create(request));
    }

    @Override
    public ResponseEntity<MarketLocation> adminUpdateMarketLocation(Long locationId, MarketLocationCreateRequest request) {
        return ResponseEntity.ok(marketLocationService.update(locationId, request));
    }

    @Override
    public ResponseEntity<Void> adminDeleteMarketLocation(Long locationId) {
        marketLocationService.delete(locationId);
        return ResponseEntity.noContent().build();
    }

    // --- Dispute resolution ---

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<com.mermaid.app.model.Order> adminResolveDispute(Long orderId, AdminResolveDisputeRequest request) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!"DISPUTED".equals(order.getStatus())) {
            throw new IllegalArgumentException("Order is not in DISPUTED status");
        }
        String outcome = request.getOutcome().getValue();
        order.setStatus(outcome);
        if ("COMPLETED".equals(outcome)) order.setCompletedAt(OffsetDateTime.now());
        orderRepo.save(order);
        String notes = (request.getNotes() != null && request.getNotes().isPresent())
                       ? request.getNotes().get() : "";
        timelineService.recordEvent(orderId, outcome, SecurityUtils.currentUserId(),
                "Admin resolved dispute: " + notes);
        return ResponseEntity.ok(buyerOrderMapper.toModel(order));
    }
}
