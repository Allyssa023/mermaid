CREATE TABLE order_disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  raised_by VARCHAR(20) NOT NULL CHECK (raised_by IN ('FISHERMAN', 'VENDOR')),
  pre_dispute_status VARCHAR(20) NOT NULL,
  original_weight_kg DECIMAL(8,2),
  claimed_weight_kg DECIMAL(8,2),
  claimed_quality VARCHAR(20) CHECK (claimed_quality IN ('FRESH', 'SUBSTANDARD', 'DAMAGED')),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolved_at TIMESTAMP,
  resolution TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_disputes_order_id ON order_disputes(order_id);
