package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "bfar_reference_prices")
public class BfarReferencePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "species_id", nullable = false)
    private FishSpecies species;

    @Column(name = "min_price_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal minPricePerKg;

    @Column(name = "max_price_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxPricePerKg;

    @Column(name = "source", length = 200, nullable = false)
    private String source = "BFAR Region 1 NCPMR";

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public FishSpecies getSpecies() { return species; }
    public void setSpecies(FishSpecies species) { this.species = species; }
    public BigDecimal getMinPricePerKg() { return minPricePerKg; }
    public void setMinPricePerKg(BigDecimal minPricePerKg) { this.minPricePerKg = minPricePerKg; }
    public BigDecimal getMaxPricePerKg() { return maxPricePerKg; }
    public void setMaxPricePerKg(BigDecimal maxPricePerKg) { this.maxPricePerKg = maxPricePerKg; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
