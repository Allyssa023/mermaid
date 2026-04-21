CREATE TABLE payments (
  id              BIGSERIAL      PRIMARY KEY,
  order_id        BIGINT         NOT NULL REFERENCES orders(id),
  handoff_id      BIGINT         REFERENCES handoff_confirmations(id),
  payer_id        BIGINT         NOT NULL REFERENCES users(id),
  payee_id        BIGINT         NOT NULL REFERENCES users(id),
  amount          NUMERIC(10,2)  NOT NULL,
  method          VARCHAR(20)    CONSTRAINT chk_payment_method
                    CHECK (method IN ('CASH','GCASH','MAYA','COD','CREDIT','BANK_TRANSFER')),
  proof_reference VARCHAR(200),
  status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
    CONSTRAINT chk_payment_status CHECK (status IN ('PENDING','CONFIRMED','DISPUTED')),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    DEFAULT now()
);

CREATE INDEX idx_payments_order ON payments (order_id);
