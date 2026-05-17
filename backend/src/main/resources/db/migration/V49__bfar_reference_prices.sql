CREATE TABLE bfar_reference_prices (
    id              BIGSERIAL PRIMARY KEY,
    species_id      BIGINT NOT NULL REFERENCES fish_species(id),
    min_price_per_kg NUMERIC(10,2) NOT NULL,
    max_price_per_kg NUMERIC(10,2) NOT NULL,
    source          VARCHAR(200) NOT NULL DEFAULT 'BFAR Region 1 NCPMR',
    effective_date  DATE NOT NULL,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX bfar_reference_prices_species_date_idx
    ON bfar_reference_prices(species_id, effective_date DESC);
