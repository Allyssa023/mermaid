package com.mermaid.app.repository;

import com.mermaid.app.domain.CatchAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface CatchAlertRepository extends JpaRepository<CatchAlert, Long> {

    List<CatchAlert> findAllByFishermanIdOrderByCreatedAtDesc(Long fishermanId);

    List<CatchAlert> findAllByStatusOrderByCreatedAtDesc(String status);

    List<CatchAlert> findAllBySpeciesIdAndStatus(Long speciesId, String status);

    Optional<CatchAlert> findByIdAndFishermanId(Long id, Long fishermanId);

    @Modifying
    @Query("UPDATE CatchAlert a SET a.status = 'EXPIRED' WHERE a.status = 'ACTIVE' AND a.expiresAt < :now")
    int expireStaleAlerts(OffsetDateTime now);

    @Query(value = "SELECT * FROM catch_alerts WHERE id IN :ids ORDER BY id ASC FOR UPDATE",
           nativeQuery = true)
    List<CatchAlert> findByIdInForUpdate(@org.springframework.data.repository.query.Param("ids") java.util.Collection<Long> ids);

    @Query("SELECT a FROM CatchAlert a WHERE a.status = 'ACTIVE' AND a.expiresAt > :now ORDER BY a.createdAt DESC")
    List<CatchAlert> findActiveFeed(OffsetDateTime now);

    @Query("SELECT a FROM CatchAlert a WHERE a.status = 'ACTIVE' AND a.expiresAt > :now AND a.species.id = :speciesId ORDER BY a.createdAt DESC")
    List<CatchAlert> findActiveFeedBySpecies(OffsetDateTime now, Long speciesId);
}
