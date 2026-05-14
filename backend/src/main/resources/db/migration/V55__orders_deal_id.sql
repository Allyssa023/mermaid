ALTER TABLE orders ADD COLUMN deal_id BIGINT REFERENCES deals(id);
CREATE INDEX idx_orders_deal ON orders (deal_id);
