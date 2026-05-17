package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "login_events")
public class LoginEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "logged_in_at", nullable = false)
    private OffsetDateTime loggedInAt;

    @PrePersist
    protected void onCreate() { if (loggedInAt == null) loggedInAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public OffsetDateTime getLoggedInAt() { return loggedInAt; }
    public void setLoggedInAt(OffsetDateTime loggedInAt) { this.loggedInAt = loggedInAt; }
}
