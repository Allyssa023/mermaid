CREATE TABLE listing_interests (
    id              BIGSERIAL    PRIMARY KEY,
    listing_id      BIGINT       NOT NULL REFERENCES demand_listings(id),
    fisherman_id    BIGINT       NOT NULL REFERENCES users(id),
    message         VARCHAR(500) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_listing_fisherman UNIQUE (listing_id, fisherman_id)
);

CREATE INDEX idx_listing_interests_fisherman ON listing_interests (fisherman_id);
CREATE INDEX idx_listing_interests_listing   ON listing_interests (listing_id);
