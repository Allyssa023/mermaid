package com.mermaid.app.domain;

import com.mermaid.app.model.Severity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "advisories")
public class Advisory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Severity severity;

    @Column(name = "affected_area", nullable = false, length = 150)
    private String affectedArea;

    @Column(name = "active_from", nullable = false)
    private OffsetDateTime activeFrom;

    @Column(name = "active_to", nullable = false)
    private OffsetDateTime activeTo;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Severity getSeverity() { return severity; }
    public void setSeverity(Severity severity) { this.severity = severity; }
    public String getAffectedArea() { return affectedArea; }
    public void setAffectedArea(String affectedArea) { this.affectedArea = affectedArea; }
    public OffsetDateTime getActiveFrom() { return activeFrom; }
    public void setActiveFrom(OffsetDateTime activeFrom) { this.activeFrom = activeFrom; }
    public OffsetDateTime getActiveTo() { return activeTo; }
    public void setActiveTo(OffsetDateTime activeTo) { this.activeTo = activeTo; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean isActive) { this.isActive = isActive; }
    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
