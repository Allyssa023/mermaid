package com.mermaid.app.repository;

import com.mermaid.app.domain.StorefrontListingLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StorefrontListingLotRepository extends JpaRepository<StorefrontListingLot, StorefrontListingLot.Id> {

    List<StorefrontListingLot> findByIdListingId(Long listingId);

    List<StorefrontListingLot> findByIdLotId(Long lotId);

    // Intentionally includes UNPUBLISHED and SOLD_OUT listings — a lot is locked
    // to its listing until that listing is explicitly deleted.
    @Query(value = "SELECT EXISTS (" +
                   "  SELECT 1 FROM storefront_listing_lots sll" +
                   "  JOIN storefront_listings sl ON sl.id = sll.listing_id" +
                   "  WHERE sll.lot_id = :lotId AND sl.is_deleted = false" +
                   ")", nativeQuery = true)
    boolean existsByLotIdInActiveListing(@Param("lotId") Long lotId);

    // Used on update to check if a lot is already in a DIFFERENT active listing.
    @Query(value = "SELECT EXISTS (" +
                   "  SELECT 1 FROM storefront_listing_lots sll" +
                   "  JOIN storefront_listings sl ON sl.id = sll.listing_id" +
                   "  WHERE sll.lot_id = :lotId AND sl.is_deleted = false" +
                   "  AND sll.listing_id != :excludeListingId" +
                   ")", nativeQuery = true)
    boolean existsByLotIdInActiveListingExcluding(@Param("lotId") Long lotId,
                                                   @Param("excludeListingId") Long excludeListingId);
}
