ALTER TABLE orders ADD COLUMN completed_at TIMESTAMPTZ;
CREATE INDEX idx_orders_completed_at ON orders (completed_at) WHERE completed_at IS NOT NULL;
