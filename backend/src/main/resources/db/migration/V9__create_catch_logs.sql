CREATE TABLE catch_logs (
    id                     BIGSERIAL      PRIMARY KEY,
    trip_id                BIGINT         NOT NULL REFERENCES trips(id),
    species_id             BIGINT         NOT NULL REFERENCES fish_species(id),
    quantity_kg            NUMERIC(10,2)  NOT NULL,
    estimated_price_per_kg NUMERIC(10,2),
    matched_listing_id     BIGINT         REFERENCES demand_listings(id) ON DELETE SET NULL,
    notes                  TEXT,
    logged_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT chk_catch_logs_quantity CHECK (quantity_kg >= 0.1)
);

CREATE INDEX idx_catch_logs_trip ON catch_logs (trip_id);
