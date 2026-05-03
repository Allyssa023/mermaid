package com.mermaid.app.controller;

import com.mermaid.app.api.ReviewsApi;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.CreateReviewRequest;
import com.mermaid.app.model.PagedReviews;
import com.mermaid.app.model.Review;
import com.mermaid.app.model.UpdateReviewRequest;
import com.mermaid.app.model.VendorStorefront;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.ReviewService;
import com.mermaid.app.service.VendorStorefrontService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReviewController implements ReviewsApi {

    private final ReviewService service;
    private final VendorStorefrontService storefrontService;

    public ReviewController(ReviewService service, VendorStorefrontService storefrontService) {
        this.service = service;
        this.storefrontService = storefrontService;
    }

    @Override
    @PreAuthorize("hasRole('BUYER')")
    public ResponseEntity<Review> createOrderReview(Long orderId, CreateReviewRequest request) {
        return ResponseEntity.status(201).body(
                service.createForOrder(SecurityUtils.currentUserId(), orderId, request));
    }

    @Override
    @PreAuthorize("hasRole('BUYER')")
    public ResponseEntity<Review> getOrderReview(Long orderId) {
        return service.getMyReviewForOrder(SecurityUtils.currentUserId(), orderId)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("No review for this order yet"));
    }

    @Override
    @PreAuthorize("hasRole('BUYER')")
    public ResponseEntity<Review> updateOrderReview(Long orderId, UpdateReviewRequest request) {
        return ResponseEntity.ok(
                service.updateForOrder(SecurityUtils.currentUserId(), orderId, request));
    }

    @Override
    public ResponseEntity<PagedReviews> getVendorReviews(Long vendorId, Integer page, Integer size) {
        return ResponseEntity.ok(service.listForVendor(vendorId, page, size));
    }

    @Override
    public ResponseEntity<VendorStorefront> getVendorStorefront(Long vendorId) {
        return ResponseEntity.ok(storefrontService.getStorefront(vendorId));
    }
}
