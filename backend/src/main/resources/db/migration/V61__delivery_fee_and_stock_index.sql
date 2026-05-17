ALTER TABLE storefront_listings
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_orders_storefront_listing_status
    ON orders(storefront_listing_id, status);
