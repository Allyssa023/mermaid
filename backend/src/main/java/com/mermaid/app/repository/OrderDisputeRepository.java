package com.mermaid.app.repository;

import com.mermaid.app.domain.OrderDispute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderDisputeRepository extends JpaRepository<OrderDispute, Long> {
    Optional<OrderDispute> findByOrderIdAndStatus(Long orderId, String status);
    boolean existsByOrderIdAndStatus(Long orderId, String status);
}
