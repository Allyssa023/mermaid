package com.mermaid.app.repository;

import com.mermaid.app.domain.CatchLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CatchLogRepository extends JpaRepository<CatchLog, Long> {

    // @EntityGraph prevents N+1: species is JOIN-fetched in a single query for all rows
    @EntityGraph(attributePaths = {"species"})
    List<CatchLog> findAllByTripIdOrderByLoggedAtDesc(Long tripId);

    // Scoped to a trip — returns empty if catch belongs to a different trip
    Optional<CatchLog> findByIdAndTripId(Long id, Long tripId);

    // Fetches all catch logs across all trips owned by a fisherman in one query
    @EntityGraph(attributePaths = {"species"})
    @Query("SELECT c FROM CatchLog c WHERE c.tripId IN " +
           "(SELECT t.id FROM Trip t WHERE t.fishermanId = :fishermanId)")
    List<CatchLog> findAllByFishermanId(@Param("fishermanId") Long fishermanId);
}
