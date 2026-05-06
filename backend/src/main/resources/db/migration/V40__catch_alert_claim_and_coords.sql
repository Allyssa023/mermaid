ALTER TABLE catch_alerts
    ADD COLUMN claimed_kg NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (claimed_kg >= 0),
    ADD COLUMN lat NUMERIC(9,6),
    ADD COLUMN lng NUMERIC(9,6);

ALTER TABLE catch_alerts
    ADD CONSTRAINT chk_catch_alerts_claim_bound
    CHECK (quantity_kg IS NULL OR claimed_kg <= quantity_kg);

-- Best-effort backfill lat/lng from market_locations via landing_site
UPDATE catch_alerts ca
SET lat = ml.lat, lng = ml.lng
FROM market_locations ml
WHERE ca.lat IS NULL
  AND ca.landing_site IS NOT NULL
  AND lower(ml.name) = lower(ca.landing_site);

CREATE INDEX idx_catch_alerts_active_available
    ON catch_alerts (status, expires_at)
    WHERE status = 'ACTIVE';
