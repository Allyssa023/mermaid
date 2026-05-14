ALTER TABLE procurement_cart_items ADD COLUMN deal_id BIGINT REFERENCES deals(id);
