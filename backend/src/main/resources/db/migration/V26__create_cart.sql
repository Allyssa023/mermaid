-- Phase 1.3 — Buyer cart system. One cart per buyer; items snapshot the listing's
-- price at the time of add so mid-shopping price changes don't surprise the buyer.

CREATE TABLE carts (
    id          BIGSERIAL    PRIMARY KEY,
    buyer_id    BIGINT       NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
    id                   BIGSERIAL      PRIMARY KEY,
    cart_id              BIGINT         NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    listing_id           BIGINT         NOT NULL REFERENCES demand_listings(id) ON DELETE CASCADE,
    quantity_kg          NUMERIC(10,2)  NOT NULL,
    unit_price_snapshot  NUMERIC(10,2)  NOT NULL,
    notes                TEXT,
    added_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT chk_cart_items_qty CHECK (quantity_kg > 0),
    CONSTRAINT uq_cart_items_cart_listing UNIQUE (cart_id, listing_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);
CREATE INDEX idx_cart_items_listing ON cart_items (listing_id);
