package com.mermaid.app.repository;

import com.mermaid.app.domain.InventoryMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {

    List<InventoryMovement> findByLotIdOrderByCreatedAtAsc(Long lotId);

    boolean existsByRefOrderId(Long refOrderId);
}
