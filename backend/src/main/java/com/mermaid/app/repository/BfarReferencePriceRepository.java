package com.mermaid.app.repository;

import com.mermaid.app.domain.BfarReferencePrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BfarReferencePriceRepository extends JpaRepository<BfarReferencePrice, Long> {

    List<BfarReferencePrice> findAllByOrderByEffectiveDateDesc();

    List<BfarReferencePrice> findBySpeciesIdOrderByEffectiveDateDesc(Long speciesId);

    @Query("SELECT b FROM BfarReferencePrice b WHERE b.species.id = :speciesId ORDER BY b.effectiveDate DESC")
    List<BfarReferencePrice> findBySpeciesLatestFirst(@Param("speciesId") Long speciesId);

    @Query(value = "SELECT DISTINCT ON (species_id) * FROM bfar_reference_prices ORDER BY species_id, effective_date DESC",
           nativeQuery = true)
    List<BfarReferencePrice> findLatestPerSpecies();
}
