package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "catch_alerts")
public class CatchAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fisherman_id", nullable = false)
    private Long fishermanId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "species_id", nullable = false)
    private FishSpecies species;

    @Column(name = "catch_log_id")
    private Long catchLogId;

    @Column(name = "quantity_estimate", length = 100)
    private String quantityEstimate;

    @Column(name = "quantity_kg", precision = 10, scale = 2)
    private BigDecimal quantityKg;

    @Column(name = "landing_site", length = 200)
    private String landingSite;

    @Column(name = "asking_price_per_kg", precision = 10, scale = 2)
    private BigDecimal askingPricePerKg;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "claimed_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal claimedKg = BigDecimal.ZERO;

    @Column(name = "lat", precision = 9, scale = 6)
    private BigDecimal lat;

    @Column(name = "lng", precision = 9, scale = 6)
    private BigDecimal lng;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (status == null) status = "ACTIVE";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getFishermanId() { return fishermanId; }
    public void setFishermanId(Long fishermanId) { this.fishermanId = fishermanId; }
    public FishSpecies getSpecies() { return species; }
    public void setSpecies(FishSpecies species) { this.species = species; }
    public Long getCatchLogId() { return catchLogId; }
    public void setCatchLogId(Long catchLogId) { this.catchLogId = catchLogId; }
    public String getQuantityEstimate() { return quantityEstimate; }
    public void setQuantityEstimate(String quantityEstimate) { this.quantityEstimate = quantityEstimate; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
    public String getLandingSite() { return landingSite; }
    public void setLandingSite(String landingSite) { this.landingSite = landingSite; }
    public BigDecimal getAskingPricePerKg() { return askingPricePerKg; }
    public void setAskingPricePerKg(BigDecimal askingPricePerKg) { this.askingPricePerKg = askingPricePerKg; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }
    public BigDecimal getClaimedKg() { return claimedKg; }
    public void setClaimedKg(BigDecimal claimedKg) { this.claimedKg = claimedKg; }
    public BigDecimal getLat() { return lat; }
    public void setLat(BigDecimal lat) { this.lat = lat; }
    public BigDecimal getLng() { return lng; }
    public void setLng(BigDecimal lng) { this.lng = lng; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
