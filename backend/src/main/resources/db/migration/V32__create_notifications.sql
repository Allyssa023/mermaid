-- V32: Create notifications and notification preferences tables
-- Phase 3.2: In-app notification system

CREATE TABLE IF NOT EXISTS notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    type            VARCHAR(30) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    link            VARCHAR(500),
    read_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at)
    WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id),
    order_status    BOOLEAN NOT NULL DEFAULT TRUE,
    new_listing     BOOLEAN NOT NULL DEFAULT TRUE,
    messages        BOOLEAN NOT NULL DEFAULT TRUE,
    review_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    advisories      BOOLEAN NOT NULL DEFAULT TRUE
);
