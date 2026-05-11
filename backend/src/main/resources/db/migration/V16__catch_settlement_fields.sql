-- Add settlement fields to catch_logs to support Feature 1
ALTER TABLE catch_logs ALTER COLUMN quantity_kg DROP NOT NULL;

ALTER TABLE catch_logs ADD COLUMN IF NOT EXISTS quantity_estimate VARCHAR(100);
ALTER TABLE catch_logs ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;
ALTER TABLE catch_logs ADD COLUMN IF NOT EXISTS settled_kg NUMERIC(10,2);
ALTER TABLE catch_logs ADD COLUMN IF NOT EXISTS settled_price_per_kg NUMERIC(10,2);
ALTER TABLE catch_logs ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
ALTER TABLE catch_logs ADD COLUMN IF NOT EXISTS settled_with_vendor_id BIGINT REFERENCES users(id);
ALTER TABLE catch_logs ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(150);
