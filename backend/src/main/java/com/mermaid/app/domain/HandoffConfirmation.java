package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "handoff_confirmations")
public class HandoffConfirmation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "actual_qty_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal actualQtyKg;

    @Column(name = "final_price_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal finalPricePerKg;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "confirmed_by_buyer", nullable = false)
    private Boolean confirmedByBuyer = false;

    @Column(name = "confirmed_by_seller", nullable = false)
    private Boolean confirmedBySeller = false;

    @Column(name = "dispute_reason", columnDefinition = "TEXT")
    private String disputeReason;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        if (status == null) status = "PENDING";
        if (confirmedByBuyer == null) confirmedByBuyer = false;
        if (confirmedBySeller == null) confirmedBySeller = false;
        if (totalAmount == null && actualQtyKg != null && finalPricePerKg != null) {
            totalAmount = actualQtyKg.multiply(finalPricePerKg);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public BigDecimal getActualQtyKg() { return actualQtyKg; }
    public void setActualQtyKg(BigDecimal actualQtyKg) { this.actualQtyKg = actualQtyKg; }
    public BigDecimal getFinalPricePerKg() { return finalPricePerKg; }
    public void setFinalPricePerKg(BigDecimal finalPricePerKg) { this.finalPricePerKg = finalPricePerKg; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public Boolean getConfirmedByBuyer() { return confirmedByBuyer; }
    public void setConfirmedByBuyer(Boolean confirmedByBuyer) { this.confirmedByBuyer = confirmedByBuyer; }
    public Boolean getConfirmedBySeller() { return confirmedBySeller; }
    public void setConfirmedBySeller(Boolean confirmedBySeller) { this.confirmedBySeller = confirmedBySeller; }
    public String getDisputeReason() { return disputeReason; }
    public void setDisputeReason(String disputeReason) { this.disputeReason = disputeReason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(OffsetDateTime confirmedAt) { this.confirmedAt = confirmedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
