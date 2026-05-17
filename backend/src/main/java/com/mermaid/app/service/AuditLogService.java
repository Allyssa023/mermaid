package com.mermaid.app.service;

import com.mermaid.app.domain.AuditLog;
import com.mermaid.app.model.AuditEntry;
import com.mermaid.app.repository.AuditLogRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private final AuditLogRepository repo;

    public AuditLogService(AuditLogRepository repo) { this.repo = repo; }

    @Transactional
    public void write(Long actorId, String actorName, String kind, String action, String target) {
        try {
            AuditLog entry = new AuditLog();
            entry.setActorId(actorId);
            entry.setActorName(actorName != null ? actorName : "System");
            entry.setKind(kind);
            entry.setAction(action);
            entry.setTarget(target);
            repo.save(entry);
        } catch (Exception e) {
            log.warn("Failed to write audit log entry: kind={}, action={}, target={}", kind, action, target, e);
        }
    }

    @Transactional(readOnly = true)
    public List<AuditEntry> list(String kind) {
        List<AuditLog> rows = (kind == null || kind.equals("all"))
            ? repo.findTop200ByOrderByCreatedAtDesc()
            : repo.findTop200ByKindOrderByCreatedAtDesc(kind);
        return rows.stream().map(this::toModel).collect(Collectors.toList());
    }

    private AuditEntry toModel(AuditLog a) {
        AuditEntry e = new AuditEntry();
        e.setId(a.getId());
        e.setActorId(JsonNullable.of(a.getActorId()));
        e.setActorName(a.getActorName());
        e.setKind(a.getKind());
        e.setAction(a.getAction());
        e.setTarget(JsonNullable.of(a.getTarget()));
        e.setCreatedAt(a.getCreatedAt());
        return e;
    }
}
