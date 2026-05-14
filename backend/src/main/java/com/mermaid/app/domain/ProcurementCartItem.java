package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "procurement_cart_items")
public class ProcurementCartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catch_alert_id", nullable = false)
    private CatchAlert catchAlert;

    @Column(name = "qty_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal qtyKg;

    @Column(name = "offered_price_per_kg", precision = 10, scale = 2)
    private BigDecimal offeredPricePerKg;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deal_id")
    private Deal deal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    public CatchAlert getCatchAlert() { return catchAlert; }
    public void setCatchAlert(CatchAlert catchAlert) { this.catchAlert = catchAlert; }
    public BigDecimal getQtyKg() { return qtyKg; }
    public void setQtyKg(BigDecimal qtyKg) { this.qtyKg = qtyKg; }
    public BigDecimal getOfferedPricePerKg() { return offeredPricePerKg; }
    public void setOfferedPricePerKg(BigDecimal offeredPricePerKg) { this.offeredPricePerKg = offeredPricePerKg; }
    public Deal getDeal() { return deal; }
    public void setDeal(Deal deal) { this.deal = deal; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
