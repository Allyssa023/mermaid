DROP INDEX IF EXISTS idx_payments_order;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS uq_payments_order;
ALTER TABLE payments ADD CONSTRAINT uq_payments_order UNIQUE (order_id);
