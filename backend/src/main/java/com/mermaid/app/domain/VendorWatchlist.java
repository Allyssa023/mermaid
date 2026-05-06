package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vendor_watchlists")
public class VendorWatchlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "species_id")
    private FishSpecies species;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_location_id")
    private MarketLocation marketLocation;

    @Column(name = "radius_km", precision = 6, scale = 2)
    private BigDecimal radiusKm;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

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
    public FishSpecies getSpecies() { return species; }
    public void setSpecies(FishSpecies species) { this.species = species; }
    public MarketLocation getMarketLocation() { return marketLocation; }
    public void setMarketLocation(MarketLocation marketLocation) { this.marketLocation = marketLocation; }
    public BigDecimal getRadiusKm() { return radiusKm; }
    public void setRadiusKm(BigDecimal radiusKm) { this.radiusKm = radiusKm; }
    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean deleted) { isDeleted = deleted; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
