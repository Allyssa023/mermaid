package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "buyer_id", nullable = false)
    private Long buyerId;

    @Column(name = "seller_id", nullable = false)
    private Long sellerId;

    @Column(name = "catch_alert_id")
    private Long catchAlertId;

    @Column(name = "demand_listing_id")
    private Long demandListingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "species_id", nullable = false)
    private FishSpecies species;

    @Column(name = "ordered_qty_estimate", length = 100)
    private String orderedQtyEstimate;

    @Column(name = "ordered_qty_kg", precision = 10, scale = 2)
    private BigDecimal orderedQtyKg;

    @Column(name = "agreed_price_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal agreedPricePerKg;

    @Column(name = "dispatch_mode", length = 20)
    private String dispatchMode;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "storefront_listing_id")
    private Long storefrontListingId;

    @Column(name = "cart_checkout_id")
    private UUID cartCheckoutId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (status == null) status = "PENDING";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBuyerId() { return buyerId; }
    public void setBuyerId(Long buyerId) { this.buyerId = buyerId; }
    public Long getSellerId() { return sellerId; }
    public void setSellerId(Long sellerId) { this.sellerId = sellerId; }
    public Long getCatchAlertId() { return catchAlertId; }
    public void setCatchAlertId(Long catchAlertId) { this.catchAlertId = catchAlertId; }
    public Long getDemandListingId() { return demandListingId; }
    public void setDemandListingId(Long demandListingId) { this.demandListingId = demandListingId; }
    public FishSpecies getSpecies() { return species; }
    public void setSpecies(FishSpecies species) { this.species = species; }
    public String getOrderedQtyEstimate() { return orderedQtyEstimate; }
    public void setOrderedQtyEstimate(String orderedQtyEstimate) { this.orderedQtyEstimate = orderedQtyEstimate; }
    public BigDecimal getOrderedQtyKg() { return orderedQtyKg; }
    public void setOrderedQtyKg(BigDecimal orderedQtyKg) { this.orderedQtyKg = orderedQtyKg; }
    public BigDecimal getAgreedPricePerKg() { return agreedPricePerKg; }
    public void setAgreedPricePerKg(BigDecimal agreedPricePerKg) { this.agreedPricePerKg = agreedPricePerKg; }
    public String getDispatchMode() { return dispatchMode; }
    public void setDispatchMode(String dispatchMode) { this.dispatchMode = dispatchMode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
    public Long getStorefrontListingId() { return storefrontListingId; }
    public void setStorefrontListingId(Long storefrontListingId) { this.storefrontListingId = storefrontListingId; }

    public UUID getCartCheckoutId() { return cartCheckoutId; }
    public void setCartCheckoutId(UUID cartCheckoutId) { this.cartCheckoutId = cartCheckoutId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
