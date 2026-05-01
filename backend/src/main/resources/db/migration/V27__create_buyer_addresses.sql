-- Phase 1.4 — Buyer address book. Soft-delete via `active`. At most one
-- default-address per buyer (enforced by partial unique index).

CREATE TABLE buyer_addresses (
    id              BIGSERIAL    PRIMARY KEY,
    buyer_id        BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label           VARCHAR(60)  NOT NULL,
    recipient_name  VARCHAR(120) NOT NULL,
    phone           VARCHAR(40),
    address_line1   VARCHAR(255) NOT NULL,
    address_line2   VARCHAR(255),
    barangay        VARCHAR(120),
    city            VARCHAR(120) NOT NULL,
    province        VARCHAR(120),
    postal_code     VARCHAR(20),
    latitude        NUMERIC(9,6),
    longitude       NUMERIC(9,6),
    is_default      BOOLEAN      NOT NULL DEFAULT false,
    active          BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_addresses_buyer ON buyer_addresses (buyer_id) WHERE active;
CREATE UNIQUE INDEX uq_buyer_addresses_default
    ON buyer_addresses (buyer_id) WHERE is_default AND active;
