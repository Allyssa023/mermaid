package com.mermaid.app.repository;

import com.mermaid.app.domain.StorefrontListingLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StorefrontListingLotRepository extends JpaRepository<StorefrontListingLot, StorefrontListingLot.Id> {

    List<StorefrontListingLot> findByIdListingId(Long listingId);

    List<StorefrontListingLot> findByIdLotId(Long lotId);

    @Query("SELECT COUNT(sll) > 0 FROM StorefrontListingLot sll " +
           "JOIN StorefrontListing sl ON sll.id.listingId = sl.id " +
           "WHERE sll.id.lotId = :lotId AND sl.isDeleted = false")
    boolean existsByLotIdInActiveListing(@Param("lotId") Long lotId);
}
