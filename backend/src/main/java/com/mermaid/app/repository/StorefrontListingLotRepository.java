package com.mermaid.app.repository;

import com.mermaid.app.domain.StorefrontListingLot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StorefrontListingLotRepository extends JpaRepository<StorefrontListingLot, StorefrontListingLot.Id> {

    List<StorefrontListingLot> findByIdListingId(Long listingId);

    List<StorefrontListingLot> findByIdLotId(Long lotId);
}
