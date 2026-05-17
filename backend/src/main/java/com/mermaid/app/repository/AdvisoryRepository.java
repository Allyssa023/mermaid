package com.mermaid.app.repository;

import com.mermaid.app.domain.Advisory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface AdvisoryRepository extends JpaRepository<Advisory, Long> {

    @Query("SELECT a FROM Advisory a WHERE a.isActive = true ORDER BY a.createdAt DESC")
    List<Advisory> findAllActiveOrderByCreatedAtDesc();

    @Query("SELECT a FROM Advisory a " +
           "WHERE a.isActive = true " +
           "AND a.activeFrom <= :now AND a.activeTo >= :now " +
           "ORDER BY a.createdAt DESC")
    List<Advisory> findActive(@Param("now") OffsetDateTime now);

    @Query("SELECT COUNT(a) FROM Advisory a WHERE a.isActive = true")
    long countActive();
}
