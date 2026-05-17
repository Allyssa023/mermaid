package com.mermaid.app.repository;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.model.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(Long fishermanId, TripStatus status);

    List<Trip> findAllByFishermanIdOrderByStartedAtDescIdDesc(Long fishermanId);

    // Ownership check baked in — returns empty if trip belongs to a different fisherman
    Optional<Trip> findByIdAndFishermanId(Long id, Long fishermanId);

    long countByStatus(com.mermaid.app.model.TripStatus status);

    @Query(value = "SELECT COUNT(*) FROM trips WHERE DATE(started_at AT TIME ZONE 'UTC') = CURRENT_DATE", nativeQuery = true)
    long countStartedToday();
}
