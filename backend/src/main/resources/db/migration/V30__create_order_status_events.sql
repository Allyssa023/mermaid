-- Phase 2.4 — Append-only audit log of order status transitions. Every change
-- to orders.status writes one row here so the buyer's "order tracking" UI has
-- a real timeline (not just "current state" via the orders row).

CREATE TABLE order_status_events (
    id          BIGSERIAL    PRIMARY KEY,
    order_id    BIGINT       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status      VARCHAR(32)  NOT NULL,
    actor_id    BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    note        TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_status_events_order ON order_status_events (order_id, created_at);

-- Backfill: synthesize an event for every existing order using its current
-- status and creation time so timelines are not empty for pre-2.4 orders.
INSERT INTO order_status_events (order_id, status, actor_id, note, created_at)
SELECT id, COALESCE(status, 'PENDING'), buyer_id,
       'Backfilled from existing order state', created_at
FROM orders;
