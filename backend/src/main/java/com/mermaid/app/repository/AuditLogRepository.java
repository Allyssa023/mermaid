package com.mermaid.app.repository;

import com.mermaid.app.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findTop200ByOrderByCreatedAtDesc();

    List<AuditLog> findTop200ByKindOrderByCreatedAtDesc(String kind);
}
