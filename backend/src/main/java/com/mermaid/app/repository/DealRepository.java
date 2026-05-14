package com.mermaid.app.repository;

import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface DealRepository extends JpaRepository<Deal, Long> {

    List<Deal> findByVendorIdAndStatus(Long vendorId, DealStatus status);

    List<Deal> findByFishermanIdAndStatus(Long fishermanId, DealStatus status);

    List<Deal> findByCatchAlertIdAndStatus(Long alertId, DealStatus status);

    Optional<Deal> findByVendorIdAndCatchAlertIdAndStatus(
            Long vendorId, Long alertId, DealStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Deal d where d.id = :id")
    Optional<Deal> findByIdForUpdate(@Param("id") Long id);

    @Query("select d from Deal d where d.status = 'NEGOTIATING' and d.expiresAt < :now order by d.expiresAt asc")
    List<Deal> findExpired(@Param("now") OffsetDateTime now);

    @Query("select count(d) from Deal d where d.catchAlert.id = :alertId " +
            "and d.status = 'NEGOTIATING' and d.vendorId <> :excludeVendorId")
    int countOpenDealsOnAlertExcludingVendor(
            @Param("alertId") Long alertId,
            @Param("excludeVendorId") Long excludeVendorId);
}
