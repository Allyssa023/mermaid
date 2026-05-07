package com.mermaid.app.repository;

import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.domain.StorefrontListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StorefrontListingRepository extends JpaRepository<StorefrontListing, Long> {

    List<StorefrontListing> findByVendorIdAndIsDeletedFalse(Long vendorId);

    List<StorefrontListing> findByStatusAndIsDeletedFalse(StorefrontListingStatus status);

    List<StorefrontListing> findByVendorIdAndStatusAndIsDeletedFalse(Long vendorId, StorefrontListingStatus status);

    Optional<StorefrontListing> findByIdAndIsDeletedFalse(Long id);
}
