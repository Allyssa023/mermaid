package com.mermaid.app.repository;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT o FROM Order o WHERE o.buyerId = :userId OR o.sellerId = :userId ORDER BY o.createdAt DESC")
    List<Order> findAllByParticipant(Long userId);

    @Query("SELECT o FROM Order o WHERE (o.buyerId = :userId OR o.sellerId = :userId) AND o.status = :status ORDER BY o.createdAt DESC")
    List<Order> findAllByParticipantAndStatus(Long userId, String status);

    @Query("SELECT o FROM Order o WHERE o.id = :id AND (o.buyerId = :userId OR o.sellerId = :userId)")
    Optional<Order> findByIdAndParticipant(Long id, Long userId);

    long countByBuyerId(Long buyerId);

    @Query("SELECT o FROM Order o WHERE o.sellerId = :vendorId AND o.status IN :statuses ORDER BY o.createdAt DESC")
    List<Order> findBySellerIdAndStatusIn(Long vendorId, java.util.Collection<String> statuses);

    @Query("SELECT o FROM Order o WHERE o.buyerId = :buyerId AND o.kind = :kind AND o.status IN :statuses ORDER BY o.createdAt DESC")
    List<Order> findByBuyerIdAndKindAndStatusIn(Long buyerId, com.mermaid.app.domain.OrderKind kind,
                                                java.util.Collection<String> statuses);

    @Query("SELECT o FROM Order o WHERE o.sellerId = :sellerId AND o.kind = :kind AND o.status IN :statuses ORDER BY o.createdAt DESC")
    List<Order> findBySellerIdAndKindAndStatusIn(Long sellerId, com.mermaid.app.domain.OrderKind kind,
                                                 java.util.Collection<String> statuses);

    @Query("SELECT DISTINCT o.sellerId FROM Order o WHERE o.buyerId = :buyerId AND o.kind = 'PROCUREMENT'")
    List<Long> findDistinctFishermenByVendor(Long buyerId);

    @Query(value = """
            SELECT o.buyer_id AS buyerId,
                   COUNT(*) AS orderCount,
                   SUM(o.agreed_price_per_kg * o.ordered_qty_kg) AS totalSpent,
                   MAX(o.completed_at) AS lastOrder
            FROM orders o
            WHERE o.seller_id = :vendorId
              AND o.order_kind = 'RETAIL'
              AND o.status = 'COMPLETED'
              AND o.completed_at BETWEEN :from AND :to
            GROUP BY o.buyer_id
            HAVING COUNT(*) >= :minOrders
            ORDER BY orderCount DESC, totalSpent DESC
            LIMIT 50
            """, nativeQuery = true)
    List<Object[]> findRepeatBuyers(@Param("vendorId") Long vendorId,
                                    @Param("from") java.time.OffsetDateTime from,
                                    @Param("to") java.time.OffsetDateTime to,
                                    @Param("minOrders") int minOrders);

    @Query("SELECT o FROM Order o WHERE o.sellerId = :vendorId AND o.kind = :kind AND o.status = 'COMPLETED' AND o.completedAt BETWEEN :from AND :to")
    List<Order> findCompletedByVendorAndKindInRange(@Param("vendorId") Long vendorId,
                                                    @Param("kind") OrderKind kind,
                                                    @Param("from") java.time.OffsetDateTime from,
                                                    @Param("to") java.time.OffsetDateTime to);

    @Query("SELECT o FROM Order o WHERE o.buyerId = :vendorId AND o.kind = :kind AND o.status = 'COMPLETED' AND o.completedAt BETWEEN :from AND :to")
    List<Order> findCompletedByBuyerAndKindInRange(@Param("vendorId") Long vendorId,
                                                   @Param("kind") OrderKind kind,
                                                   @Param("from") java.time.OffsetDateTime from,
                                                   @Param("to") java.time.OffsetDateTime to);

    @Query("SELECT o FROM Order o WHERE o.sellerId = :sellerId AND o.kind = :kind AND o.status = :status AND o.completedAt BETWEEN :from AND :to ORDER BY o.completedAt DESC")
    List<Order> findBySellerIdAndKindAndStatusAndCompletedAtBetween(
        @Param("sellerId") Long sellerId,
        @Param("kind") OrderKind kind,
        @Param("status") String status,
        @Param("from") java.time.OffsetDateTime from,
        @Param("to") java.time.OffsetDateTime to);

    @Query("SELECT o FROM Order o WHERE o.sellerId = :sellerId AND o.status = :status AND o.completedAt BETWEEN :from AND :to ORDER BY o.completedAt DESC")
    List<Order> findBySellerIdAndStatusAndCompletedAtBetween(
        @Param("sellerId") Long sellerId,
        @Param("status") String status,
        @Param("from") java.time.OffsetDateTime from,
        @Param("to") java.time.OffsetDateTime to);

    @Query("SELECT COALESCE(SUM(o.orderedQtyKg), 0) FROM Order o " +
           "WHERE o.storefrontListingId = :listingId " +
           "AND o.status IN ('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT')")
    BigDecimal sumActiveOrderedKgForStorefrontListing(@Param("listingId") Long listingId);

    List<Order> findByStatusAndUpdatedAtBefore(String status, OffsetDateTime before);
}
