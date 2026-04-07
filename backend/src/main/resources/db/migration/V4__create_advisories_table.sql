-- Week 2 prep: Advisories table (CRUD implemented in Week 3)
-- Stores admin-posted safety advisories visible to all fishermen.

CREATE TABLE advisories (
    id             BIGSERIAL    PRIMARY KEY,
    title          VARCHAR(150) NOT NULL,
    message        VARCHAR(1000) NOT NULL,
    severity       VARCHAR(20)  NOT NULL
                       CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    affected_area  VARCHAR(255) NOT NULL,
    active_from    TIMESTAMPTZ  NOT NULL,
    active_to      TIMESTAMPTZ  NOT NULL,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by_user_id BIGINT   REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast lookup for the fisherman feed: active advisories only
CREATE INDEX idx_advisories_is_active     ON advisories(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_advisories_active_window ON advisories(active_from, active_to);
CREATE INDEX idx_advisories_severity      ON advisories(severity);
