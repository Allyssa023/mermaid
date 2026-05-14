package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "deal_proposals")
public class DealProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    @Column(name = "proposed_by_id", nullable = false)
    private Long proposedById;

    @Column(name = "qty_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal qtyKg;

    @Column(name = "price_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProposalStatus status = ProposalStatus.PENDING;

    @Column(name = "superseded_reason", length = 20)
    private String supersededReason;

    @Column(name = "responded_by_id")
    private Long respondedById;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Deal getDeal() { return deal; }
    public void setDeal(Deal deal) { this.deal = deal; }
    public Long getProposedById() { return proposedById; }
    public void setProposedById(Long proposedById) { this.proposedById = proposedById; }
    public BigDecimal getQtyKg() { return qtyKg; }
    public void setQtyKg(BigDecimal qtyKg) { this.qtyKg = qtyKg; }
    public BigDecimal getPricePerKg() { return pricePerKg; }
    public void setPricePerKg(BigDecimal pricePerKg) { this.pricePerKg = pricePerKg; }
    public ProposalStatus getStatus() { return status; }
    public void setStatus(ProposalStatus status) { this.status = status; }
    public String getSupersededReason() { return supersededReason; }
    public void setSupersededReason(String supersededReason) { this.supersededReason = supersededReason; }
    public Long getRespondedById() { return respondedById; }
    public void setRespondedById(Long respondedById) { this.respondedById = respondedById; }
    public OffsetDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(OffsetDateTime respondedAt) { this.respondedAt = respondedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
