CREATE TABLE procurement_cart_items (
    id           BIGSERIAL PRIMARY KEY,
    vendor_id    BIGINT        NOT NULL REFERENCES users(id),
    catch_alert_id BIGINT      NOT NULL REFERENCES catch_alerts(id),
    qty_kg       NUMERIC(10,2) NOT NULL CHECK (qty_kg > 0),
    offered_price_per_kg NUMERIC(10,2),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_procurement_cart_vendor_alert UNIQUE (vendor_id, catch_alert_id)
);

CREATE INDEX idx_procurement_cart_vendor ON procurement_cart_items (vendor_id);
