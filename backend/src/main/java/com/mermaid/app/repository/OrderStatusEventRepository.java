package com.mermaid.app.repository;

import com.mermaid.app.domain.OrderStatusEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface OrderStatusEventRepository extends JpaRepository<OrderStatusEvent, Long> {

    List<OrderStatusEvent> findByOrderIdOrderByCreatedAtAsc(Long orderId);

    @Query("SELECT e FROM OrderStatusEvent e WHERE e.orderId IN " +
           "(SELECT o.id FROM Order o WHERE o.buyerId = :buyerId) " +
           "ORDER BY e.createdAt DESC")
    List<OrderStatusEvent> findRecentForBuyer(Long buyerId, Pageable pageable);
}
