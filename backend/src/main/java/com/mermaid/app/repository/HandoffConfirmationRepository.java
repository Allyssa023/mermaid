package com.mermaid.app.repository;

import com.mermaid.app.domain.HandoffConfirmation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HandoffConfirmationRepository extends JpaRepository<HandoffConfirmation, Long> {

    Optional<HandoffConfirmation> findByOrderId(Long orderId);
}
