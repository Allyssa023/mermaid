-- Advisories table for publishing safety and market information to fishermen and vendors.
-- Admins create advisories with severity levels and time-bound active periods.

CREATE TABLE advisories (
    id                  BIGSERIAL    PRIMARY KEY,
    title               VARCHAR(150) NOT NULL,
    message             TEXT         NOT NULL,
    severity            VARCHAR(20)  NOT NULL,
    affected_area       VARCHAR(150) NOT NULL,
    active_from         TIMESTAMPTZ  NOT NULL,
    active_to           TIMESTAMPTZ  NOT NULL,
    is_active           BOOLEAN      NOT NULL DEFAULT true,
    created_by_user_id  BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_advisories_severity CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);

CREATE INDEX idx_advisories_active ON advisories (is_active, active_from, active_to)
    WHERE is_active = true;

COMMENT ON TABLE advisories IS 'Safety and market advisories for fishermen and vendors.';
COMMENT ON COLUMN advisories.severity IS 'LOW, MEDIUM, HIGH, or CRITICAL; indicates advisory urgency.';
COMMENT ON COLUMN advisories.created_by_user_id IS 'Admin user who created the advisory.';
