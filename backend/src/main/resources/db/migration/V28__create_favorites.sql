-- Phase 2.1 — Buyer favorites/wishlist. Polymorphic target lets a buyer save
-- both individual listings and entire vendors with one table. UNIQUE prevents
-- duplicate saves. No soft-delete — unfavoriting just removes the row.

CREATE TABLE favorites (
    id           BIGSERIAL    PRIMARY KEY,
    buyer_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type  VARCHAR(16)  NOT NULL,
    target_id    BIGINT       NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_favorites_target_type CHECK (target_type IN ('LISTING', 'VENDOR')),
    CONSTRAINT uq_favorites_buyer_target UNIQUE (buyer_id, target_type, target_id)
);

CREATE INDEX idx_favorites_buyer_type ON favorites (buyer_id, target_type);
CREATE INDEX idx_favorites_target ON favorites (target_type, target_id);
