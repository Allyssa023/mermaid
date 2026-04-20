ALTER TABLE catch_logs
    ADD COLUMN quantity_estimate      VARCHAR(200),
    ADD COLUMN is_settled             BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN settled_kg             NUMERIC(10,2),
    ADD COLUMN settled_price_per_kg   NUMERIC(10,2),
    ADD COLUMN settled_at             TIMESTAMPTZ,
    ADD COLUMN settled_with_vendor_id BIGINT REFERENCES users(id);

ALTER TABLE catch_logs ALTER COLUMN quantity_kg DROP NOT NULL;
ALTER TABLE catch_logs DROP CONSTRAINT chk_catch_logs_quantity;
ALTER TABLE catch_logs ADD CONSTRAINT chk_catch_logs_quantity
    CHECK (quantity_kg IS NULL OR quantity_kg >= 0.1);
