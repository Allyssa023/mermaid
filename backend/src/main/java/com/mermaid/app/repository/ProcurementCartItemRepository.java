package com.mermaid.app.repository;

import com.mermaid.app.domain.ProcurementCartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProcurementCartItemRepository extends JpaRepository<ProcurementCartItem, Long> {

    List<ProcurementCartItem> findAllByVendorIdOrderByCreatedAtAsc(Long vendorId);

    Optional<ProcurementCartItem> findByVendorIdAndCatchAlertId(Long vendorId, Long catchAlertId);

    Optional<ProcurementCartItem> findByIdAndVendorId(Long id, Long vendorId);

    Optional<ProcurementCartItem> findByDealId(Long dealId);

    @Modifying
    @Query("DELETE FROM ProcurementCartItem c WHERE c.deal.id = :dealId")
    int deleteByDealId(Long dealId);

    @Modifying
    @Query("DELETE FROM ProcurementCartItem c WHERE c.vendorId = :vendorId")
    void deleteAllByVendorId(Long vendorId);
}
