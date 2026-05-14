CREATE TABLE deals (
    id                   BIGSERIAL PRIMARY KEY,
    catch_alert_id       BIGINT       NOT NULL REFERENCES catch_alerts(id),
    vendor_id            BIGINT       NOT NULL REFERENCES users(id),
    fisherman_id         BIGINT       NOT NULL REFERENCES users(id),
    status               VARCHAR(20)  NOT NULL DEFAULT 'NEGOTIATING'
        CHECK (status IN ('NEGOTIATING','AGREED','REJECTED','EXPIRED','CANCELLED')),
    agreed_qty_kg        NUMERIC(10,2),
    agreed_price_per_kg  NUMERIC(10,2),
    agreed_at            TIMESTAMPTZ,
    order_id             BIGINT REFERENCES orders(id),
    fisherman_engaged_at TIMESTAMPTZ,
    expires_at           TIMESTAMPTZ  NOT NULL,
    closed_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_deals_open_pair
    ON deals (vendor_id, catch_alert_id) WHERE status = 'NEGOTIATING';
CREATE INDEX idx_deals_fisherman ON deals (fisherman_id);
CREATE INDEX idx_deals_alert     ON deals (catch_alert_id);
CREATE INDEX idx_deals_status    ON deals (status);

CREATE TABLE deal_proposals (
    id              BIGSERIAL PRIMARY KEY,
    deal_id         BIGINT       NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    proposed_by_id  BIGINT       NOT NULL REFERENCES users(id),
    qty_kg          NUMERIC(10,2) NOT NULL CHECK (qty_kg >= 0.1),
    price_per_kg    NUMERIC(10,2) NOT NULL CHECK (price_per_kg >= 0),
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','ACCEPTED','REJECTED','SUPERSEDED')),
    superseded_reason VARCHAR(20)
        CHECK (superseded_reason IN ('NEW_PROPOSAL','OVERCOMMIT')),
    responded_by_id BIGINT REFERENCES users(id),
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_proposals_deal ON deal_proposals (deal_id);
CREATE UNIQUE INDEX uq_deal_proposals_pending
    ON deal_proposals (deal_id) WHERE status = 'PENDING';
