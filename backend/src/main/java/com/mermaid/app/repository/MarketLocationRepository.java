package com.mermaid.app.repository;

import com.mermaid.app.domain.MarketLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MarketLocationRepository extends JpaRepository<MarketLocation, Long> {
    List<MarketLocation> findAllByActiveTrue();
}
