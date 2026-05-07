package com.mermaid.app.service;

import com.mermaid.app.domain.Review;
import com.mermaid.app.domain.ShopProfile;
import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.ReviewMapper;
import com.mermaid.app.mapper.ShopProfileMapper;
import com.mermaid.app.mapper.StorefrontListingMapper;
import com.mermaid.app.model.PublicShopView;
import com.mermaid.app.model.ReviewWithReply;
import com.mermaid.app.model.ShopProfileRequest;
import com.mermaid.app.model.StorefrontListingResponse;
import com.mermaid.app.repository.ReviewRepository;
import com.mermaid.app.repository.ShopProfileRepository;
import com.mermaid.app.repository.StorefrontListingRepository;
import com.mermaid.app.repository.UserRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ShopProfileService {

    private static final java.util.regex.Pattern SLUG_PATTERN =
            java.util.regex.Pattern.compile("^[a-z][a-z0-9-]{2,49}$");

    private final ShopProfileRepository shopProfileRepo;
    private final ShopProfileMapper shopProfileMapper;
    private final ReviewRepository reviewRepo;
    private final ReviewMapper reviewMapper;
    private final StorefrontListingRepository listingRepo;
    private final StorefrontListingMapper listingMapper;
    private final InventoryService inventoryService;
    private final UserRepository userRepo;

    public ShopProfileService(ShopProfileRepository shopProfileRepo,
                               ShopProfileMapper shopProfileMapper,
                               ReviewRepository reviewRepo,
                               ReviewMapper reviewMapper,
                               StorefrontListingRepository listingRepo,
                               StorefrontListingMapper listingMapper,
                               InventoryService inventoryService,
                               UserRepository userRepo) {
        this.shopProfileRepo = shopProfileRepo;
        this.shopProfileMapper = shopProfileMapper;
        this.reviewRepo = reviewRepo;
        this.reviewMapper = reviewMapper;
        this.listingRepo = listingRepo;
        this.listingMapper = listingMapper;
        this.inventoryService = inventoryService;
        this.userRepo = userRepo;
    }

    @Transactional
    public com.mermaid.app.model.ShopProfile getMine(Long vendorId) {
        ShopProfile profile = shopProfileRepo.findByVendorIdAndIsDeletedFalse(vendorId)
                .orElseGet(() -> {
                    ShopProfile p = new ShopProfile();
                    p.setVendorId(vendorId);
                    p.setSlug("vendor-" + vendorId);
                    p.setDisplayName("Vendor " + vendorId);
                    return shopProfileRepo.save(p);
                });
        return shopProfileMapper.toDto(profile);
    }

    @Transactional
    public com.mermaid.app.model.ShopProfile updateMine(Long vendorId, ShopProfileRequest req) {
        ShopProfile profile = shopProfileRepo.findByVendorIdAndIsDeletedFalse(vendorId)
                .orElseGet(() -> {
                    ShopProfile p = new ShopProfile();
                    p.setVendorId(vendorId);
                    p.setSlug("vendor-" + vendorId);
                    p.setDisplayName("Vendor " + vendorId);
                    return shopProfileRepo.save(p);
                });

        if (req.getSlug() != null && req.getSlug().isPresent()) {
            String newSlug = req.getSlug().get();
            if (!SLUG_PATTERN.matcher(newSlug).matches()) {
                throw new IllegalArgumentException(
                        "Slug must start with a letter and contain only lowercase letters, digits, and hyphens (3–50 chars)");
            }
            if (shopProfileRepo.existsBySlugAndIsDeletedFalseAndIdNot(newSlug, profile.getId())) {
                throw new IllegalArgumentException("Slug '" + newSlug + "' is already taken");
            }
        }

        shopProfileMapper.applyPatch(req, profile);
        return shopProfileMapper.toDto(shopProfileRepo.save(profile));
    }

    @Transactional(readOnly = true)
    public PublicShopView getPublic(String vendorIdOrSlug) {
        ShopProfile profile = resolveProfile(vendorIdOrSlug);

        com.mermaid.app.model.ShopProfile profileDto = shopProfileMapper.toDto(profile);

        List<StorefrontListing> listings = listingRepo.findByVendorIdAndStatusAndIsDeletedFalse(
                profile.getVendorId(), StorefrontListingStatus.PUBLISHED);
        List<StorefrontListingResponse> listingDtos = listings.stream()
                .map(l -> listingMapper.toDto(l,
                        inventoryService.availableKg(profile.getVendorId(), l.getSpeciesId())))
                .toList();

        List<Review> recentReviews = reviewRepo
                .findAllByVendorIdOrderByCreatedAtDesc(profile.getVendorId(), PageRequest.of(0, 5))
                .getContent();
        List<Long> reviewerIds = recentReviews.stream().map(Review::getReviewerId).distinct().toList();
        Map<Long, User> reviewersById = userRepo.findAllById(reviewerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        List<ReviewWithReply> reviewDtos = recentReviews.stream()
                .map(r -> reviewMapper.toReviewWithReply(r, reviewersById.get(r.getReviewerId())))
                .toList();

        Double avgRating = reviewRepo.avgRatingForVendor(profile.getVendorId()).orElse(null);
        long reviewCount = reviewRepo.countByVendorId(profile.getVendorId());

        PublicShopView view = new PublicShopView(profileDto);
        view.setAvgRating(JsonNullable.of(avgRating));
        view.setReviewCount((int) reviewCount);
        view.setListings(listingDtos);
        view.setRecentReviews(reviewDtos);
        return view;
    }

    private ShopProfile resolveProfile(String vendorIdOrSlug) {
        try {
            Long vendorId = Long.parseLong(vendorIdOrSlug);
            return shopProfileRepo.findByVendorIdAndIsDeletedFalse(vendorId)
                    .orElseThrow(() -> new ResourceNotFoundException("Shop not found: " + vendorIdOrSlug));
        } catch (NumberFormatException e) {
            return shopProfileRepo.findBySlugAndIsDeletedFalse(vendorIdOrSlug)
                    .orElseThrow(() -> new ResourceNotFoundException("Shop not found: " + vendorIdOrSlug));
        }
    }
}
