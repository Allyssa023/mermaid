CREATE TABLE handoff_confirmations (
  id                  BIGSERIAL      PRIMARY KEY,
  order_id            BIGINT         NOT NULL REFERENCES orders(id),
  actual_qty_kg       NUMERIC(10,2)  NOT NULL,
  final_price_per_kg  NUMERIC(10,2)  NOT NULL,
  total_amount        NUMERIC(10,2)  NOT NULL,
  confirmed_by_buyer  BOOLEAN        NOT NULL DEFAULT FALSE,
  confirmed_by_seller BOOLEAN        NOT NULL DEFAULT FALSE,
  dispute_reason      TEXT,
  status              VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
    CONSTRAINT chk_handoff_status CHECK (status IN ('PENDING','CONFIRMED','DISPUTED')),
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ    DEFAULT now()
);

CREATE INDEX idx_handoff_order ON handoff_confirmations (order_id);
