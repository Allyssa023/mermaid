package com.mermaid.app.controller;

import com.mermaid.app.model.DemandListing;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BuyerRecommendationsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Phase 4.3 — buyer recommendations endpoint.
 */
@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerRecommendationsController {

    private final BuyerRecommendationsService service;

    public BuyerRecommendationsController(BuyerRecommendationsService service) {
        this.service = service;
    }

    @GetMapping("/buyer/recommendations")
    public ResponseEntity<List<DemandListing>> getRecommendations(
            @RequestParam(defaultValue = "8") int limit) {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(service.getRecommendations(buyerId, limit));
    }
}
