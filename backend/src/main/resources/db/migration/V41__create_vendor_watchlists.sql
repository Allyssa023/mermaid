CREATE TABLE vendor_watchlists (
    id                  BIGSERIAL    PRIMARY KEY,
    vendor_id           BIGINT       NOT NULL REFERENCES users(id),
    species_id          BIGINT       REFERENCES fish_species(id),
    market_location_id  BIGINT       REFERENCES market_locations(id),
    radius_km           NUMERIC(6,2),
    is_deleted          BOOLEAN      NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_watchlist_at_least_one
        CHECK (species_id IS NOT NULL OR market_location_id IS NOT NULL)
);

CREATE INDEX idx_watchlist_vendor_active
    ON vendor_watchlists (vendor_id) WHERE is_deleted = false;
CREATE INDEX idx_watchlist_species
    ON vendor_watchlists (species_id) WHERE is_deleted = false AND species_id IS NOT NULL;
CREATE INDEX idx_watchlist_location
    ON vendor_watchlists (market_location_id) WHERE is_deleted = false AND market_location_id IS NOT NULL;
