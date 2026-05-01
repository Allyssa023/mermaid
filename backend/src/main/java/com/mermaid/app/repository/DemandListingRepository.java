package com.mermaid.app.repository;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.model.DemandListingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface DemandListingRepository extends JpaRepository<DemandListing, Long> {

    @EntityGraph(attributePaths = {"species", "location"})
    List<DemandListing> findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(Long vendorId);

    @EntityGraph(attributePaths = {"species", "location"})
    List<DemandListing> findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(
            Long vendorId, DemandListingStatus status);

    @EntityGraph(attributePaths = {"species", "location"})
    Optional<DemandListing> findByIdAndVendorIdAndIsDeletedFalse(Long id, Long vendorId);

    // --- Marketplace queries (Week 5) ---

    @EntityGraph(attributePaths = {"species", "location"})
    @Query("SELECT d FROM DemandListing d " +
           "WHERE d.status = :status AND d.isDeleted = false " +
           "AND (:speciesId  IS NULL OR d.species.id      = :speciesId) " +
           "AND (:locationId IS NULL OR d.location.id     = :locationId) " +
           "AND (:minPrice   IS NULL OR d.offerPricePerKg >= :minPrice) " +
           "AND (:maxPrice   IS NULL OR d.offerPricePerKg <= :maxPrice) " +
           "ORDER BY d.postedAt DESC, d.id DESC")
    List<DemandListing> findOpenListings(
            @Param("status")     DemandListingStatus status,
            @Param("speciesId")  Long speciesId,
            @Param("locationId") Long locationId,
            @Param("minPrice")   BigDecimal minPrice,
            @Param("maxPrice")   BigDecimal maxPrice);

    @EntityGraph(attributePaths = {"species", "location"})
    @Query("SELECT d FROM DemandListing d " +
           "WHERE d.status = :status AND d.isDeleted = false " +
           "AND d.species.id = :speciesId " +
           "AND (:locationId IS NULL OR d.location.id = :locationId) " +
           "ORDER BY d.offerPricePerKg ASC")
    List<DemandListing> findOpenOffersBySpecies(
            @Param("status")     DemandListingStatus status,
            @Param("speciesId")  Long speciesId,
            @Param("locationId") Long locationId);

    /**
     * Phase 1.1 — searchable, filterable, paginated browse.
     * `q` matches species commonName, listing notes, or vendor full name (subquery on users).
     * Sort + pagination handled by Pageable.
     * Distance filter/sort is applied in service layer (in-memory haversine), so any caller
     * needing distance should pass an unsized Pageable here and slice afterwards.
     */
    @EntityGraph(attributePaths = {"species", "location"})
    @Query("""
        SELECT d FROM DemandListing d
        WHERE d.status = :status AND d.isDeleted = false
          AND (:speciesId  IS NULL OR d.species.id      = :speciesId)
          AND (:locationId IS NULL OR d.location.id     = :locationId)
          AND (:minPrice   IS NULL OR d.offerPricePerKg >= :minPrice)
          AND (:maxPrice   IS NULL OR d.offerPricePerKg <= :maxPrice)
          AND (:q IS NULL OR
               LOWER(d.species.commonName) LIKE :q OR
               LOWER(COALESCE(d.notes, '')) LIKE :q OR
               d.vendorId IN (
                   SELECT u.id FROM User u WHERE LOWER(u.fullName) LIKE :q
               ))
        """)
    Page<DemandListing> searchOpenListings(
            @Param("status")     DemandListingStatus status,
            @Param("q")          String qLike,
            @Param("speciesId")  Long speciesId,
            @Param("locationId") Long locationId,
            @Param("minPrice")   BigDecimal minPrice,
            @Param("maxPrice")   BigDecimal maxPrice,
            Pageable pageable);
}
