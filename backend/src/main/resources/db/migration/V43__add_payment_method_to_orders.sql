ALTER TABLE orders
  ADD COLUMN payment_method VARCHAR(10) DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH', 'CREDIT')),
  ADD COLUMN settled_at TIMESTAMP,
  ADD COLUMN settle_notes TEXT;
