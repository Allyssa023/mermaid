package com.mermaid.app.repository;

import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.domain.StorefrontListingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StorefrontListingRepository extends JpaRepository<StorefrontListing, Long> {

    List<StorefrontListing> findByVendorIdAndIsDeletedFalse(Long vendorId);

    List<StorefrontListing> findByStatusAndIsDeletedFalse(StorefrontListingStatus status);

    List<StorefrontListing> findByVendorIdAndStatusAndIsDeletedFalse(Long vendorId, StorefrontListingStatus status);

    Optional<StorefrontListing> findByIdAndIsDeletedFalse(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StorefrontListing s WHERE s.id = :id AND s.isDeleted = false")
    Optional<StorefrontListing> findByIdWithLock(@Param("id") Long id);
}
