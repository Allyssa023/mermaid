package com.mermaid.app.repository;

import com.mermaid.app.domain.FishSpecies;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FishSpeciesRepository extends JpaRepository<FishSpecies, Long> {
    List<FishSpecies> findAllByActiveTrue();
}
