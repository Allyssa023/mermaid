package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.Review;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.DemandListingMapper;
import com.mermaid.app.mapper.ReviewMapper;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.model.VendorStorefront;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.ReviewRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class VendorStorefrontService {

    private final UserRepository userRepo;
    private final DemandListingRepository listingRepo;
    private final ReviewRepository reviewRepo;
    private final DemandListingMapper listingMapper;
    private final ReviewMapper reviewMapper;

    public VendorStorefrontService(UserRepository userRepo,
                                    DemandListingRepository listingRepo,
                                    ReviewRepository reviewRepo,
                                    DemandListingMapper listingMapper,
                                    ReviewMapper reviewMapper) {
        this.userRepo = userRepo;
        this.listingRepo = listingRepo;
        this.reviewRepo = reviewRepo;
        this.listingMapper = listingMapper;
        this.reviewMapper = reviewMapper;
    }

    @Transactional(readOnly = true)
    public VendorStorefront getStorefront(Long vendorId) {
        User vendor = userRepo.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + vendorId));

        List<DemandListing> openListings = listingRepo
                .findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(
                        vendorId, DemandListingStatus.OPEN);

        List<Review> recentReviews = reviewRepo
                .findAllByVendorIdOrderByCreatedAtDesc(vendorId, PageRequest.of(0, 5))
                .getContent();

        // Hydrate reviewer names in one batch.
        List<Long> reviewerIds = recentReviews.stream()
                .map(Review::getReviewerId).distinct().toList();
        Map<Long, User> reviewersById = userRepo.findAllById(reviewerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<com.mermaid.app.model.DemandListing> listingModels = openListings.stream()
                .map(l -> listingMapper.toModel(l, vendor.getFullName()))
                .toList();

        List<com.mermaid.app.model.Review> reviewModels = recentReviews.stream()
                .map(r -> reviewMapper.toModel(r, null, reviewersById.get(r.getReviewerId())))
                .toList();

        return new VendorStorefront(
                listingMapper.toVendorProfile(vendor),
                listingModels,
                reviewModels);
    }
}
