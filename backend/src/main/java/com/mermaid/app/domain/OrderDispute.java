package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "order_disputes")
public class OrderDispute {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "raised_by", nullable = false, length = 20)
    private String raisedBy;

    @Column(name = "pre_dispute_status", nullable = false, length = 20)
    private String preDisputeStatus;

    @Column(name = "original_weight_kg", precision = 8, scale = 2)
    private BigDecimal originalWeightKg;

    @Column(name = "claimed_weight_kg", precision = 8, scale = 2)
    private BigDecimal claimedWeightKg;

    @Column(name = "claimed_quality", length = 20)
    private String claimedQuality;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, length = 20)
    private String status = "OPEN";

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(columnDefinition = "TEXT")
    private String resolution;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getRaisedBy() { return raisedBy; }
    public void setRaisedBy(String raisedBy) { this.raisedBy = raisedBy; }
    public String getPreDisputeStatus() { return preDisputeStatus; }
    public void setPreDisputeStatus(String preDisputeStatus) { this.preDisputeStatus = preDisputeStatus; }
    public BigDecimal getOriginalWeightKg() { return originalWeightKg; }
    public void setOriginalWeightKg(BigDecimal v) { this.originalWeightKg = v; }
    public BigDecimal getClaimedWeightKg() { return claimedWeightKg; }
    public void setClaimedWeightKg(BigDecimal v) { this.claimedWeightKg = v; }
    public String getClaimedQuality() { return claimedQuality; }
    public void setClaimedQuality(String v) { this.claimedQuality = v; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public String getResolution() { return resolution; }
    public void setResolution(String resolution) { this.resolution = resolution; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
