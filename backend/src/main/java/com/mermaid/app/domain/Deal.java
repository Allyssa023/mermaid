package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "deals")
public class Deal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catch_alert_id", nullable = false)
    private CatchAlert catchAlert;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @Column(name = "fisherman_id", nullable = false)
    private Long fishermanId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DealStatus status = DealStatus.NEGOTIATING;

    @Column(name = "agreed_qty_kg", precision = 10, scale = 2)
    private BigDecimal agreedQtyKg;

    @Column(name = "agreed_price_per_kg", precision = 10, scale = 2)
    private BigDecimal agreedPricePerKg;

    @Column(name = "agreed_at")
    private OffsetDateTime agreedAt;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "fisherman_engaged_at")
    private OffsetDateTime fishermanEngagedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public CatchAlert getCatchAlert() { return catchAlert; }
    public void setCatchAlert(CatchAlert catchAlert) { this.catchAlert = catchAlert; }
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    public Long getFishermanId() { return fishermanId; }
    public void setFishermanId(Long fishermanId) { this.fishermanId = fishermanId; }
    public DealStatus getStatus() { return status; }
    public void setStatus(DealStatus status) { this.status = status; }
    public BigDecimal getAgreedQtyKg() { return agreedQtyKg; }
    public void setAgreedQtyKg(BigDecimal agreedQtyKg) { this.agreedQtyKg = agreedQtyKg; }
    public BigDecimal getAgreedPricePerKg() { return agreedPricePerKg; }
    public void setAgreedPricePerKg(BigDecimal agreedPricePerKg) { this.agreedPricePerKg = agreedPricePerKg; }
    public OffsetDateTime getAgreedAt() { return agreedAt; }
    public void setAgreedAt(OffsetDateTime agreedAt) { this.agreedAt = agreedAt; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public OffsetDateTime getFishermanEngagedAt() { return fishermanEngagedAt; }
    public void setFishermanEngagedAt(OffsetDateTime fishermanEngagedAt) { this.fishermanEngagedAt = fishermanEngagedAt; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }
    public OffsetDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(OffsetDateTime closedAt) { this.closedAt = closedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
