package com.mermaid.app.repository;

import com.mermaid.app.domain.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByOrderId(Long orderId);

    Page<Review> findAllByVendorIdOrderByCreatedAtDesc(Long vendorId, Pageable pageable);

    long countByVendorId(Long vendorId);

    @Query("SELECT AVG(CAST(r.rating AS double)) FROM Review r WHERE r.vendorId = :vendorId")
    Optional<Double> avgRatingForVendor(@Param("vendorId") Long vendorId);

    long countByReviewerId(Long reviewerId);
}
