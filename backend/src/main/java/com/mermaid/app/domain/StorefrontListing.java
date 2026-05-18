package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "storefront_listings")
public class StorefrontListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @Column(name = "species_id", nullable = false)
    private Long speciesId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "photo_eyes")
    private String photoEyes;

    @Column(name = "photo_gills")
    private String photoGills;

    @Column(name = "photo_scales")
    private String photoScales;

    @Column(name = "photo_belly")
    private String photoBelly;

    @Column(name = "photo_flesh")
    private String photoFlesh;

    @Column(name = "price_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerKg;

    @Column(name = "min_qty_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal minQtyKg = new BigDecimal("0.5");

    @Column(name = "delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private StorefrontListingStatus status = StorefrontListingStatus.DRAFT;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "view_count", nullable = false)
    private int viewCount = 0;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }

    public Long getSpeciesId() { return speciesId; }
    public void setSpeciesId(Long speciesId) { this.speciesId = speciesId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getPhotoEyes() { return photoEyes; }
    public void setPhotoEyes(String photoEyes) { this.photoEyes = photoEyes; }

    public String getPhotoGills() { return photoGills; }
    public void setPhotoGills(String photoGills) { this.photoGills = photoGills; }

    public String getPhotoScales() { return photoScales; }
    public void setPhotoScales(String photoScales) { this.photoScales = photoScales; }

    public String getPhotoBelly() { return photoBelly; }
    public void setPhotoBelly(String photoBelly) { this.photoBelly = photoBelly; }

    public String getPhotoFlesh() { return photoFlesh; }
    public void setPhotoFlesh(String photoFlesh) { this.photoFlesh = photoFlesh; }

    public BigDecimal getPricePerKg() { return pricePerKg; }
    public void setPricePerKg(BigDecimal pricePerKg) { this.pricePerKg = pricePerKg; }

    public BigDecimal getMinQtyKg() { return minQtyKg; }
    public void setMinQtyKg(BigDecimal minQtyKg) { this.minQtyKg = minQtyKg; }

    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public void setDeliveryFee(BigDecimal deliveryFee) { this.deliveryFee = deliveryFee; }

    public StorefrontListingStatus getStatus() { return status; }
    public void setStatus(StorefrontListingStatus status) { this.status = status; }

    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean deleted) { isDeleted = deleted; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public int getViewCount() { return viewCount; }
    public void setViewCount(int viewCount) { this.viewCount = viewCount; }
}
