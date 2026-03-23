-- Reference tables for fish species and market locations.
-- Used for dropdown selection and lookup in the application.

CREATE TABLE fish_species (
    id              BIGSERIAL    PRIMARY KEY,
    common_name     VARCHAR(100) NOT NULL,
    scientific_name VARCHAR(150),
    active          BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_fish_species_common_name UNIQUE (common_name)
);

CREATE INDEX idx_fish_species_active ON fish_species (active) WHERE active = true;

CREATE TABLE market_locations (
    id           BIGSERIAL    PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    province     VARCHAR(100),
    active       BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_market_locations_name_municipality UNIQUE (name, municipality)
);

CREATE INDEX idx_market_locations_active ON market_locations (active) WHERE active = true;

COMMENT ON TABLE fish_species IS 'Reference table for fish species common and scientific names.';
COMMENT ON TABLE market_locations IS 'Reference table for wet market locations across the Philippines.';
