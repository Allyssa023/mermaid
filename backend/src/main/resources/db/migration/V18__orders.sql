CREATE TABLE orders (
  id                   BIGSERIAL      PRIMARY KEY,
  buyer_id             BIGINT         NOT NULL REFERENCES users(id),
  seller_id            BIGINT         NOT NULL REFERENCES users(id),
  catch_alert_id       BIGINT         REFERENCES catch_alerts(id),
  demand_listing_id    BIGINT         REFERENCES demand_listings(id),
  species_id           BIGINT         NOT NULL REFERENCES fish_species(id),
  ordered_qty_estimate VARCHAR(100),
  ordered_qty_kg       NUMERIC(10,2),
  agreed_price_per_kg  NUMERIC(10,2)  NOT NULL,
  dispatch_mode        VARCHAR(20)    CONSTRAINT chk_orders_dispatch CHECK (dispatch_mode IN ('PICKUP','DELIVERY')),
  status               VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
    CONSTRAINT chk_orders_status CHECK (status IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED','DISPUTED')),
  notes                TEXT,
  created_at           TIMESTAMPTZ    DEFAULT now(),
  updated_at           TIMESTAMPTZ    DEFAULT now()
);

CREATE INDEX idx_orders_buyer  ON orders (buyer_id);
CREATE INDEX idx_orders_seller ON orders (seller_id);
CREATE INDEX idx_orders_status ON orders (status);
