package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_name", nullable = false, length = 200)
    private String actorName;

    @Column(nullable = false, length = 30)
    private String kind;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(length = 300)
    private String target;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() { if (createdAt == null) createdAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public Long getActorId() { return actorId; }
    public void setActorId(Long actorId) { this.actorId = actorId; }
    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    /** Package-private setter used by tests (avoids reflection). */
    void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
