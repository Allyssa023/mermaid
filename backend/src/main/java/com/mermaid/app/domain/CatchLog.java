package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "catch_logs")
public class CatchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "species_id", nullable = false)
    private FishSpecies species;

    @Column(name = "quantity_estimate", length = 200)
    private String quantityEstimate;

    @Column(name = "quantity_kg", precision = 10, scale = 2)
    private BigDecimal quantityKg;

    @Column(name = "estimated_price_per_kg", precision = 10, scale = 2)
    private BigDecimal estimatedPricePerKg;

    @Column(name = "matched_listing_id")
    private Long matchedListingId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "logged_at", nullable = false)
    private OffsetDateTime loggedAt;

    @Column(name = "is_settled", nullable = false)
    private boolean isSettled = false;

    @Column(name = "settled_kg", precision = 10, scale = 2)
    private BigDecimal settledKg;

    @Column(name = "settled_price_per_kg", precision = 10, scale = 2)
    private BigDecimal settledPricePerKg;

    @Column(name = "settled_at")
    private OffsetDateTime settledAt;

    @Column(name = "settled_with_vendor_id")
    private Long settledWithVendorId;

    @PrePersist
    protected void onCreate() {
        if (loggedAt == null) loggedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTripId() { return tripId; }
    public void setTripId(Long tripId) { this.tripId = tripId; }
    public FishSpecies getSpecies() { return species; }
    public void setSpecies(FishSpecies species) { this.species = species; }
    public String getQuantityEstimate() { return quantityEstimate; }
    public void setQuantityEstimate(String quantityEstimate) { this.quantityEstimate = quantityEstimate; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
    public BigDecimal getEstimatedPricePerKg() { return estimatedPricePerKg; }
    public void setEstimatedPricePerKg(BigDecimal v) { this.estimatedPricePerKg = v; }
    public Long getMatchedListingId() { return matchedListingId; }
    public void setMatchedListingId(Long matchedListingId) { this.matchedListingId = matchedListingId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public OffsetDateTime getLoggedAt() { return loggedAt; }
    public void setLoggedAt(OffsetDateTime loggedAt) { this.loggedAt = loggedAt; }
    public boolean isSettled() { return isSettled; }
    public void setSettled(boolean settled) { isSettled = settled; }
    public BigDecimal getSettledKg() { return settledKg; }
    public void setSettledKg(BigDecimal settledKg) { this.settledKg = settledKg; }
    public BigDecimal getSettledPricePerKg() { return settledPricePerKg; }
    public void setSettledPricePerKg(BigDecimal settledPricePerKg) { this.settledPricePerKg = settledPricePerKg; }
    public OffsetDateTime getSettledAt() { return settledAt; }
    public void setSettledAt(OffsetDateTime settledAt) { this.settledAt = settledAt; }
    public Long getSettledWithVendorId() { return settledWithVendorId; }
    public void setSettledWithVendorId(Long settledWithVendorId) { this.settledWithVendorId = settledWithVendorId; }
}
