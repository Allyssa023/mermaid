-- Add settlement fields to catch_logs to support Feature 1
ALTER TABLE catch_logs ALTER COLUMN quantity_kg DROP NOT NULL;

ALTER TABLE catch_logs 
  ADD COLUMN quantity_estimate VARCHAR(100),
  ADD COLUMN is_settled BOOLEAN DEFAULT FALSE,
  ADD COLUMN settled_kg NUMERIC(10,2),
  ADD COLUMN settled_price_per_kg NUMERIC(10,2),
  ADD COLUMN settled_at TIMESTAMPTZ,
  ADD COLUMN settled_with_vendor_id BIGINT REFERENCES users(id),
  ADD COLUMN buyer_name VARCHAR(150);
