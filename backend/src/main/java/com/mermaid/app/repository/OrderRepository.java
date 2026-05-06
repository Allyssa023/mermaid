package com.mermaid.app.repository;

import com.mermaid.app.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
}
