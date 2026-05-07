CREATE TABLE shop_profiles (
    id                  BIGSERIAL    PRIMARY KEY,
    vendor_id           BIGINT       NOT NULL UNIQUE REFERENCES users(id),
    slug                VARCHAR(50)  NOT NULL UNIQUE
        CONSTRAINT chk_slug_format CHECK (slug ~ '^[a-z][a-z0-9-]{2,49}$'),
    display_name        VARCHAR(80)  NOT NULL CHECK (char_length(display_name) >= 2),
    bio                 TEXT,
    logo_url            VARCHAR(500),
    banner_url          VARCHAR(500),
    hours_json          JSONB,
    pickup_location_id  BIGINT       REFERENCES market_locations(id),
    lat                 NUMERIC(9,6),
    lng                 NUMERIC(9,6),
    is_deleted          BOOLEAN      NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_profiles_slug ON shop_profiles (slug) WHERE is_deleted = false;
CREATE INDEX idx_shop_profiles_vendor ON shop_profiles (vendor_id) WHERE is_deleted = false;

-- Vendor reply columns on reviews (idempotent)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vendor_reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vendor_reply_at TIMESTAMPTZ;
