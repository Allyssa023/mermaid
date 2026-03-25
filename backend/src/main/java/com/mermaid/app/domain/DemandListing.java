package com.mermaid.app.domain;

import com.mermaid.app.model.DemandListingStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "demand_listings")
public class DemandListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "species_id", nullable = false)
    private FishSpecies species;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private MarketLocation location;

    @Column(name = "quantity_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityKg;

    @Column(name = "offer_price_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal offerPricePerKg;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "needed_by")
    private OffsetDateTime neededBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DemandListingStatus status = DemandListingStatus.OPEN;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "posted_at", nullable = false)
    private OffsetDateTime postedAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (postedAt == null) postedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    public FishSpecies getSpecies() { return species; }
    public void setSpecies(FishSpecies species) { this.species = species; }
    public MarketLocation getLocation() { return location; }
    public void setLocation(MarketLocation location) { this.location = location; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
    public BigDecimal getOfferPricePerKg() { return offerPricePerKg; }
    public void setOfferPricePerKg(BigDecimal offerPricePerKg) { this.offerPricePerKg = offerPricePerKg; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public OffsetDateTime getNeededBy() { return neededBy; }
    public void setNeededBy(OffsetDateTime neededBy) { this.neededBy = neededBy; }
    public DemandListingStatus getStatus() { return status; }
    public void setStatus(DemandListingStatus status) { this.status = status; }
    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean deleted) { isDeleted = deleted; }
    public OffsetDateTime getPostedAt() { return postedAt; }
    public void setPostedAt(OffsetDateTime postedAt) { this.postedAt = postedAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
