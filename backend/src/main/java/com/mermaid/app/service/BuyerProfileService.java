package com.mermaid.app.service;

import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.BuyerProfile;
import com.mermaid.app.model.BuyerProfileUpdateRequest;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.ReviewRepository;
import com.mermaid.app.repository.FavoriteRepository;
import com.mermaid.app.repository.UserRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BuyerProfileService {

    private final UserRepository userRepo;
    private final OrderRepository orderRepo;
    private final ReviewRepository reviewRepo;
    private final FavoriteRepository favoriteRepo;

    public BuyerProfileService(UserRepository userRepo,
                                OrderRepository orderRepo,
                                ReviewRepository reviewRepo,
                                FavoriteRepository favoriteRepo) {
        this.userRepo = userRepo;
        this.orderRepo = orderRepo;
        this.reviewRepo = reviewRepo;
        this.favoriteRepo = favoriteRepo;
    }

    @Transactional(readOnly = true)
    public BuyerProfile getProfile(Long buyerId) {
        User user = userRepo.findById(buyerId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + buyerId));

        long totalOrders = orderRepo.countByBuyerId(buyerId);
        long totalReviews = reviewRepo.countByReviewerId(buyerId);
        long totalFavorites = favoriteRepo.countByBuyerId(buyerId);

        BuyerProfile profile = new BuyerProfile(
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            com.mermaid.app.model.Role.fromValue(user.getRole().getValue())
        );
        profile.setAvatarUrl(JsonNullable.of(user.getAvatarUrl()));
        profile.setTotalOrders((int) totalOrders);
        profile.setTotalReviews((int) totalReviews);
        profile.setTotalFavorites((int) totalFavorites);
        profile.setMemberSince(user.getCreatedAt());
        return profile;
    }

    @Transactional
    public BuyerProfile updateProfile(Long buyerId, BuyerProfileUpdateRequest request) {
        User user = userRepo.findById(buyerId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + buyerId));

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getAvatarUrl() != null && request.getAvatarUrl().isPresent()) {
            user.setAvatarUrl(request.getAvatarUrl().get());
        }

        userRepo.save(user);
        return getProfile(buyerId);
    }
}
