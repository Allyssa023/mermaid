package com.mermaid.app.repository;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.model.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(Long fishermanId, TripStatus status);

    List<Trip> findAllByFishermanIdOrderByStartedAtDescIdDesc(Long fishermanId);

    // Ownership check baked in — returns empty if trip belongs to a different fisherman
    Optional<Trip> findByIdAndFishermanId(Long id, Long fishermanId);
}
