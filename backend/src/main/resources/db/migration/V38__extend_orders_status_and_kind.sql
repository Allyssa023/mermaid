ALTER TABLE orders ADD COLUMN order_kind VARCHAR(16) NOT NULL DEFAULT 'RETAIL'
    CONSTRAINT chk_order_kind CHECK (order_kind IN ('RETAIL','PROCUREMENT'));

ALTER TABLE orders DROP CONSTRAINT chk_orders_status;
ALTER TABLE orders ADD CONSTRAINT chk_orders_status
    CHECK (status IN ('PENDING','CONFIRMED','ACCEPTED','READY','COMPLETED','CANCELLED','DISPUTED'));

CREATE INDEX idx_orders_seller_status_kind
    ON orders (seller_id, status, order_kind)
    WHERE status IN ('PENDING','ACCEPTED','READY');
