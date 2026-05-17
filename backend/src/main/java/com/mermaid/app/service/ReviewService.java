package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.Review;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.ReviewMapper;
import com.mermaid.app.model.CreateReviewRequest;
import com.mermaid.app.model.PagedReviews;
import com.mermaid.app.model.UpdateReviewRequest;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.ReviewRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private static final long EDIT_WINDOW_DAYS = 7;

    private final ReviewRepository reviewRepo;
    private final OrderRepository orderRepo;
    private final UserRepository userRepo;
    private final ReviewMapper mapper;

    public ReviewService(ReviewRepository reviewRepo,
                          OrderRepository orderRepo,
                          UserRepository userRepo,
                          ReviewMapper mapper) {
        this.reviewRepo = reviewRepo;
        this.orderRepo = orderRepo;
        this.userRepo = userRepo;
        this.mapper = mapper;
    }

    @Transactional
    public com.mermaid.app.model.Review createForOrder(Long buyerId, Long orderId, CreateReviewRequest req) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!buyerId.equals(order.getBuyerId())) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }
        if (!"COMPLETED".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalStateException("Order must be completed before reviewing.");
        }
        if (reviewRepo.findByOrderId(orderId).isPresent()) {
            throw new IllegalStateException("This order has already been reviewed.");
        }
        validateRating(req.getRating());

        Review entity = new Review();
        entity.setOrderId(orderId);
        entity.setReviewerId(buyerId);
        entity.setVendorId(order.getSellerId());
        entity.setRating(req.getRating().shortValue());
        entity.setComment(blankToNull(req.getComment()));
        entity.setPhotoUrls(req.getPhotoUrls() == null ? List.of() : req.getPhotoUrls());
        Review saved;
        try {
            saved = reviewRepo.save(entity);
        } catch (DataIntegrityViolationException e) {
            // Race: another request created the review first.
            throw new IllegalStateException("This order has already been reviewed.");
        }
        recomputeVendorAggregate(order.getSellerId());
        return mapper.toModel(saved, buyerId, userRepo.findById(buyerId).orElse(null));
    }

    @Transactional(readOnly = true)
    public Optional<com.mermaid.app.model.Review> getMyReviewForOrder(Long buyerId, Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!buyerId.equals(order.getBuyerId())) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }
        return reviewRepo.findByOrderId(orderId)
                .map(r -> mapper.toModel(r, buyerId, userRepo.findById(buyerId).orElse(null)));
    }

    @Transactional
    public com.mermaid.app.model.Review updateForOrder(Long buyerId, Long orderId, UpdateReviewRequest req) {
        Review entity = reviewRepo.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        if (!buyerId.equals(entity.getReviewerId())) {
            throw new ResourceNotFoundException("Review not found");
        }
        if (ChronoUnit.DAYS.between(entity.getCreatedAt(), OffsetDateTime.now()) > EDIT_WINDOW_DAYS) {
            throw new IllegalStateException("Review can no longer be edited (7-day window expired).");
        }

        if (req.getRating() != null) {
            validateRating(req.getRating());
            entity.setRating(req.getRating().shortValue());
        }
        if (req.getComment() != null) entity.setComment(blankToNull(req.getComment()));
        if (req.getPhotoUrls() != null) entity.setPhotoUrls(req.getPhotoUrls());
        Review saved = reviewRepo.save(entity);
        recomputeVendorAggregate(entity.getVendorId());
        return mapper.toModel(saved, buyerId, userRepo.findById(buyerId).orElse(null));
    }

    @Transactional(readOnly = true)
    public PagedReviews listForVendor(Long vendorId, Integer page, Integer size) {
        int p = page != null && page >= 0 ? page : 0;
        int s = size != null && size > 0 ? Math.min(size, 50) : 10;

        Page<Review> pageData = reviewRepo.findAllByVendorIdOrderByCreatedAtDesc(
                vendorId, PageRequest.of(p, s));

        List<Long> reviewerIds = pageData.getContent().stream()
                .map(Review::getReviewerId).distinct().toList();
        Map<Long, User> reviewersById = userRepo.findAllById(reviewerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<com.mermaid.app.model.Review> mapped = pageData.getContent().stream()
                .map(r -> mapper.toModel(r, null, reviewersById.get(r.getReviewerId())))
                .toList();

        PagedReviews result = new PagedReviews(mapped, pageData.getNumber(), pageData.getSize(),
                pageData.getTotalElements(), pageData.getTotalPages());
        Optional<User> vendor = userRepo.findById(vendorId);
        result.setAvgRating(org.openapitools.jackson.nullable.JsonNullable.of(
                vendor.map(u -> u.getAvgRating() == null ? null : u.getAvgRating().doubleValue()).orElse(null)));
        return result;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.ReviewWithReply> listForVendorWithReply(Long vendorId, int page, int size) {
        int s = Math.min(size, 50);
        Page<Review> pageData = reviewRepo.findAllByVendorIdOrderByCreatedAtDesc(
                vendorId, PageRequest.of(page, s));

        List<Long> reviewerIds = pageData.getContent().stream()
                .map(Review::getReviewerId).distinct().toList();
        Map<Long, User> reviewersById = userRepo.findAllById(reviewerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<Long> orderIds = pageData.getContent().stream()
                .map(Review::getOrderId).distinct().toList();
        Map<Long, Order> ordersById = orderRepo.findAllById(orderIds).stream()
                .collect(Collectors.toMap(Order::getId, o -> o));

        return pageData.getContent().stream()
                .map(r -> mapper.toReviewWithReply(r, reviewersById.get(r.getReviewerId()), ordersById.get(r.getOrderId())))
                .toList();
    }

    @Transactional
    public com.mermaid.app.model.ReviewWithReply reply(Long vendorId, Long reviewId, String replyText) {
        Review entity = reviewRepo.findByIdAndVendorId(reviewId, vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));
        entity.setVendorReply(replyText);
        entity.setVendorReplyAt(OffsetDateTime.now());
        Review saved = reviewRepo.save(entity);
        User reviewer = userRepo.findById(saved.getReviewerId()).orElse(null);
        return mapper.toReviewWithReply(saved, reviewer);
    }

    private void recomputeVendorAggregate(Long vendorId) {
        long count = reviewRepo.countByVendorId(vendorId);
        Double avg = reviewRepo.avgRatingForVendor(vendorId).orElse(null);
        userRepo.findById(vendorId).ifPresent(v -> {
            v.setReviewCount((int) count);
            v.setAvgRating(avg == null ? null : BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
            userRepo.save(v);
        });
    }

    private static void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("rating must be between 1 and 5");
        }
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
