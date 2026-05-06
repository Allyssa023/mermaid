package com.mermaid.app.repository;

import com.mermaid.app.domain.VendorWatchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VendorWatchlistRepository extends JpaRepository<VendorWatchlist, Long> {

    List<VendorWatchlist> findByVendorIdAndIsDeletedFalse(Long vendorId);

    @Query("SELECT w FROM VendorWatchlist w LEFT JOIN FETCH w.species LEFT JOIN FETCH w.marketLocation " +
           "WHERE w.isDeleted = false AND " +
           "(w.species.id = :speciesId OR w.marketLocation IS NOT NULL)")
    List<VendorWatchlist> findActiveMatchingSpeciesOrHasLocation(@Param("speciesId") Long speciesId);
}
