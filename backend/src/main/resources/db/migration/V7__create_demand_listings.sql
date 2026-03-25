CREATE TABLE demand_listings (
    id                  BIGSERIAL        PRIMARY KEY,
    vendor_id           BIGINT           NOT NULL REFERENCES users(id),
    species_id          BIGINT           NOT NULL REFERENCES fish_species(id),
    location_id         BIGINT           NOT NULL REFERENCES market_locations(id),
    quantity_kg         NUMERIC(10,2)    NOT NULL,
    offer_price_per_kg  NUMERIC(10,2)    NOT NULL,
    notes               TEXT,
    needed_by           TIMESTAMPTZ,
    status              VARCHAR(10)      NOT NULL DEFAULT 'OPEN',
    is_deleted          BOOLEAN          NOT NULL DEFAULT false,
    posted_at           TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    CONSTRAINT chk_demand_listings_status   CHECK (status IN ('OPEN', 'CLOSED')),
    CONSTRAINT chk_demand_listings_quantity CHECK (quantity_kg >= 0.1),
    CONSTRAINT chk_demand_listings_price    CHECK (offer_price_per_kg >= 0)
);

-- vendor's own list query (Week 4)
CREATE INDEX idx_demand_listings_vendor
    ON demand_listings (vendor_id, status)
    WHERE is_deleted = false;

-- species + location lookup for marketplace browse and catch-log price lookup (Week 5/6)
CREATE INDEX idx_demand_listings_open_species
    ON demand_listings (species_id, location_id)
    WHERE status = 'OPEN' AND is_deleted = false;

-- COMMENT must appear after CREATE TABLE (table must already exist)
COMMENT ON TABLE demand_listings IS
    'Vendor-posted fish demand listings. Soft-deleted via is_deleted; '
    'status (OPEN/CLOSED) is independent of deletion. '
    'Referenced by catch_logs.matched_listing_id (Week 6).';
