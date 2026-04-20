-- Phase 5+6: Social OAuth fields + schema relaxation for OAuth-only users
ALTER TABLE users
  ADD COLUMN google_id   VARCHAR(255) UNIQUE,
  ADD COLUMN facebook_id VARCHAR(255) UNIQUE;

-- OAuth users don't have a password
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

-- New OAuth users have no role until they complete profile setup
ALTER TABLE users
  ALTER COLUMN role DROP NOT NULL;

CREATE INDEX idx_users_google_id   ON users (google_id)   WHERE google_id   IS NOT NULL;
CREATE INDEX idx_users_facebook_id ON users (facebook_id) WHERE facebook_id IS NOT NULL;
