package com.mermaid.app.controller;

import com.mermaid.app.api.VendorShopApi;
import com.mermaid.app.model.ReplyToReviewRequest;
import com.mermaid.app.model.ReviewWithReply;
import com.mermaid.app.model.ShopProfile;
import com.mermaid.app.model.ShopProfileRequest;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.ReviewService;
import com.mermaid.app.service.ShopProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorShopController implements VendorShopApi {

    private final ShopProfileService shopProfileService;
    private final ReviewService reviewService;

    public VendorShopController(ShopProfileService shopProfileService, ReviewService reviewService) {
        this.shopProfileService = shopProfileService;
        this.reviewService = reviewService;
    }

    @Override
    public ResponseEntity<ShopProfile> getVendorShopProfile() {
        return ResponseEntity.ok(shopProfileService.getMine(SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<ShopProfile> updateVendorShopProfile(ShopProfileRequest shopProfileRequest) {
        return ResponseEntity.ok(shopProfileService.updateMine(SecurityUtils.currentUserId(), shopProfileRequest));
    }

    @Override
    public ResponseEntity<List<ReviewWithReply>> listVendorReviews(Integer page, Integer size) {
        int p = page != null ? page : 0;
        int s = size != null ? size : 20;
        return ResponseEntity.ok(reviewService.listForVendorWithReply(SecurityUtils.currentUserId(), p, s));
    }

    @Override
    public ResponseEntity<ReviewWithReply> replyToReview(Long id, ReplyToReviewRequest replyToReviewRequest) {
        return ResponseEntity.ok(reviewService.reply(SecurityUtils.currentUserId(), id, replyToReviewRequest.getText()));
    }
}
