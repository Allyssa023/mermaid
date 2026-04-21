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
}
