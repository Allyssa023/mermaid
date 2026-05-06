package com.mermaid.app.repository;

import com.mermaid.app.domain.InventoryLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

public interface InventoryLotRepository extends JpaRepository<InventoryLot, Long> {

    List<InventoryLot> findByVendorIdAndSpeciesIdAndRemainingKgGreaterThanOrderByReceivedAtAsc(
            Long vendorId, Long speciesId, BigDecimal minRemaining);

    List<InventoryLot> findByVendorIdOrderByReceivedAtAsc(Long vendorId);

    @Query(value = "SELECT * FROM inventory_lots WHERE id IN :ids ORDER BY received_at ASC FOR UPDATE",
           nativeQuery = true)
    List<InventoryLot> findByIdInForUpdate(@Param("ids") Collection<Long> ids);

    @Query("SELECT SUM(l.remainingKg) FROM InventoryLot l WHERE l.vendorId = :vendorId AND l.speciesId = :speciesId")
    BigDecimal sumAvailableByVendorAndSpecies(@Param("vendorId") Long vendorId, @Param("speciesId") Long speciesId);
}
