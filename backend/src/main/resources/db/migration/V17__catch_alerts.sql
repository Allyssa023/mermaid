CREATE TABLE catch_alerts (
  id                  BIGSERIAL      PRIMARY KEY,
  fisherman_id        BIGINT         NOT NULL REFERENCES users(id),
  catch_log_id        BIGINT         REFERENCES catch_logs(id),
  species_id          BIGINT         NOT NULL REFERENCES fish_species(id),
  quantity_estimate   VARCHAR(100),
  quantity_kg         NUMERIC(10,2),
  landing_site        VARCHAR(200),
  asking_price_per_kg NUMERIC(10,2),
  notes               TEXT,
  status              VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE'
    CONSTRAINT chk_catch_alerts_status CHECK (status IN ('ACTIVE','MATCHED','EXPIRED','CANCELLED')),
  expires_at          TIMESTAMPTZ    NOT NULL,
  created_at          TIMESTAMPTZ    DEFAULT now()
);

CREATE INDEX idx_catch_alerts_fisherman ON catch_alerts (fisherman_id);
CREATE INDEX idx_catch_alerts_species   ON catch_alerts (species_id);
CREATE INDEX idx_catch_alerts_status    ON catch_alerts (status);
