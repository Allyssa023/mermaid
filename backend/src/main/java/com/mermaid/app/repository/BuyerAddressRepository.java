package com.mermaid.app.repository;

import com.mermaid.app.domain.BuyerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BuyerAddressRepository extends JpaRepository<BuyerAddress, Long> {

    List<BuyerAddress> findByBuyerIdAndActiveTrueOrderByIsDefaultDescIdAsc(Long buyerId);

    Optional<BuyerAddress> findByIdAndBuyerIdAndActiveTrue(Long id, Long buyerId);

    @Modifying
    @Query("UPDATE BuyerAddress a SET a.isDefault = false WHERE a.buyerId = :buyerId AND a.isDefault = true AND a.active = true")
    int demoteAllDefaults(@Param("buyerId") Long buyerId);
}
