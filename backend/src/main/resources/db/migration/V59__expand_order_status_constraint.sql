ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;
DROP INDEX IF EXISTS idx_orders_seller_status_kind;

ALTER TABLE orders ADD CONSTRAINT chk_orders_status
    CHECK (status IN (
        'PENDING','CONFIRMED','PREPARING',
        'READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT',
        'COMPLETED','CANCELLED','DISPUTED'
    ));

CREATE INDEX idx_orders_seller_status_kind
    ON orders (seller_id, status, order_kind)
    WHERE status IN ('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT');
