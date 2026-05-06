package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inventory_lots")
public class InventoryLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @Column(name = "species_id", nullable = false)
    private Long speciesId;

    @Column(name = "source_procurement_order_id")
    private Long sourceProcurementOrderId;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "initial_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal initialKg;

    @Column(name = "remaining_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal remainingKg;

    @Column(name = "cost_per_kg", precision = 10, scale = 2)
    private BigDecimal costPerKg;

    @Column(name = "freshness_graded_at")
    private OffsetDateTime freshnessGradedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (receivedAt == null) receivedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }

    public Long getSpeciesId() { return speciesId; }
    public void setSpeciesId(Long speciesId) { this.speciesId = speciesId; }

    public Long getSourceProcurementOrderId() { return sourceProcurementOrderId; }
    public void setSourceProcurementOrderId(Long sourceProcurementOrderId) { this.sourceProcurementOrderId = sourceProcurementOrderId; }

    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public void setReceivedAt(OffsetDateTime receivedAt) { this.receivedAt = receivedAt; }

    public BigDecimal getInitialKg() { return initialKg; }
    public void setInitialKg(BigDecimal initialKg) { this.initialKg = initialKg; }

    public BigDecimal getRemainingKg() { return remainingKg; }
    public void setRemainingKg(BigDecimal remainingKg) { this.remainingKg = remainingKg; }

    public BigDecimal getCostPerKg() { return costPerKg; }
    public void setCostPerKg(BigDecimal costPerKg) { this.costPerKg = costPerKg; }

    public OffsetDateTime getFreshnessGradedAt() { return freshnessGradedAt; }
    public void setFreshnessGradedAt(OffsetDateTime freshnessGradedAt) { this.freshnessGradedAt = freshnessGradedAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
