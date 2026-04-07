package com.mermaid.app.repository;

import com.mermaid.app.domain.ListingInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ListingInterestRepository extends JpaRepository<ListingInterest, Long> {
    boolean existsByListing_IdAndFishermanId(Long listingId, Long fishermanId);
    List<ListingInterest> findByFishermanIdOrderByCreatedAtDesc(Long fishermanId);
    List<ListingInterest> findByListing_VendorIdOrderByCreatedAtDesc(Long vendorId);
}
