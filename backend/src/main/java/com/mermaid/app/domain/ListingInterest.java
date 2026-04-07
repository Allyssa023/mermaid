package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "listing_interests")
public class ListingInterest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    private DemandListing listing;

    @Column(name = "fisherman_id", nullable = false)
    private Long fishermanId;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId()                        { return id; }
    public void setId(Long id)                 { this.id = id; }
    public DemandListing getListing()          { return listing; }
    public void setListing(DemandListing l)    { this.listing = l; }
    public Long getFishermanId()               { return fishermanId; }
    public void setFishermanId(Long id)        { this.fishermanId = id; }
    public String getMessage()                 { return message; }
    public void setMessage(String message)     { this.message = message; }
    public OffsetDateTime getCreatedAt()       { return createdAt; }
    public void setCreatedAt(OffsetDateTime t) { this.createdAt = t; }
}
