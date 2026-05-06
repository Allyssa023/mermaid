package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inventory_movements")
public class InventoryMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lot_id", nullable = false)
    private Long lotId;

    @Column(name = "delta_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal deltaKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 32)
    private MovementReason reason;

    @Column(name = "ref_order_id")
    private Long refOrderId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getLotId() { return lotId; }
    public void setLotId(Long lotId) { this.lotId = lotId; }

    public BigDecimal getDeltaKg() { return deltaKg; }
    public void setDeltaKg(BigDecimal deltaKg) { this.deltaKg = deltaKg; }

    public MovementReason getReason() { return reason; }
    public void setReason(MovementReason reason) { this.reason = reason; }

    public Long getRefOrderId() { return refOrderId; }
    public void setRefOrderId(Long refOrderId) { this.refOrderId = refOrderId; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
