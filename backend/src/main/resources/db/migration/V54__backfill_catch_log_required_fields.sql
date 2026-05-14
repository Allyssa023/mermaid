-- Backfill nulls before adding NOT NULL constraints.
-- For quantity_kg: prefer settled_kg (real weight from settlement) if present,
-- else use 0.1 — the minimum value allowed by chk_catch_logs_quantity (V9).
UPDATE catch_logs
SET quantity_kg = COALESCE(settled_kg, 0.1)
WHERE quantity_kg IS NULL;

UPDATE catch_logs SET estimated_price_per_kg = 0 WHERE estimated_price_per_kg IS NULL;

ALTER TABLE catch_logs ALTER COLUMN quantity_kg SET NOT NULL;
ALTER TABLE catch_logs ALTER COLUMN estimated_price_per_kg SET NOT NULL;
