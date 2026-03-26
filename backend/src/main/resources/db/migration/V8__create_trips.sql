CREATE TABLE trips (
    id                     BIGSERIAL     PRIMARY KEY,
    fisherman_id           BIGINT        NOT NULL REFERENCES users(id),
    departure_point        VARCHAR(150)  NOT NULL,
    target_area            VARCHAR(150)  NOT NULL,
    vessel_name            VARCHAR(100),
    status                 VARCHAR(10)   NOT NULL DEFAULT 'ACTIVE',
    started_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ended_at               TIMESTAMPTZ,
    notes                  VARCHAR(500),
    fuel_checked           BOOLEAN,
    engine_checked         BOOLEAN,
    radio_checked          BOOLEAN,
    life_vest_checked      BOOLEAN,
    weather_reviewed       BOOLEAN,
    emergency_kit_checked  BOOLEAN,
    checklist_completed_at TIMESTAMPTZ,
    CONSTRAINT chk_trips_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_trips_fisherman ON trips (fisherman_id, status);
