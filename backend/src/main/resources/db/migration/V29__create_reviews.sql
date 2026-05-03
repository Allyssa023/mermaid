-- Phase 2.2 — Buyer-to-vendor reviews. One review per order. Vendor's
-- aggregate rating is denormalized onto the users row so we can sort/filter
-- by rating without joining the reviews table on every query.

CREATE TABLE reviews (
    id           BIGSERIAL    PRIMARY KEY,
    order_id     BIGINT       NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    reviewer_id  BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating       SMALLINT     NOT NULL,
    comment      TEXT,
    photo_urls   JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_reviews_vendor ON reviews (vendor_id, created_at DESC);
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_id, created_at DESC);

-- Denormalized aggregates on users (vendor side).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating  NUMERIC(3,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;
