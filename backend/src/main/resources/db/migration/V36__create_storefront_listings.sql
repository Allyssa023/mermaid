CREATE TABLE storefront_listings (
    id             BIGSERIAL    PRIMARY KEY,
    vendor_id      BIGINT       NOT NULL REFERENCES users(id),
    species_id     BIGINT       NOT NULL REFERENCES fish_species(id),
    title          VARCHAR(200) NOT NULL,
    description    TEXT,
    photo_url      VARCHAR(500),
    price_per_kg   NUMERIC(10,2) NOT NULL CHECK (price_per_kg >= 0),
    min_qty_kg     NUMERIC(10,2) NOT NULL DEFAULT 0.5 CHECK (min_qty_kg > 0),
    status         VARCHAR(16)  NOT NULL DEFAULT 'DRAFT'
        CONSTRAINT chk_storefront_status CHECK (status IN ('DRAFT','PUBLISHED','UNPUBLISHED','SOLD_OUT')),
    is_deleted     BOOLEAN      NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_storefront_active ON storefront_listings (vendor_id, status) WHERE is_deleted = false;

CREATE TABLE storefront_listing_lots (
    listing_id  BIGINT NOT NULL REFERENCES storefront_listings(id) ON DELETE CASCADE,
    lot_id      BIGINT NOT NULL REFERENCES inventory_lots(id),
    PRIMARY KEY (listing_id, lot_id)
);

CREATE INDEX idx_storefront_lot_lookup ON storefront_listing_lots (lot_id);

ALTER TABLE orders ADD COLUMN storefront_listing_id BIGINT REFERENCES storefront_listings(id);
CREATE INDEX idx_orders_storefront_listing ON orders (storefront_listing_id);
