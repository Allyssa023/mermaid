ALTER TABLE payments ADD CONSTRAINT uq_payments_order UNIQUE (order_id);
