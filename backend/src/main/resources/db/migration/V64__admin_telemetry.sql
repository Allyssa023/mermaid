ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;

CREATE TABLE login_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_events_date ON login_events (DATE(logged_in_at));

CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   BIGINT REFERENCES users(id),
  actor_name VARCHAR(200) NOT NULL,
  kind       VARCHAR(30)  NOT NULL,
  action     VARCHAR(100) NOT NULL,
  target     VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);
