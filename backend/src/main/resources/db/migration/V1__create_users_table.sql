-- Users table for authentication and authorization.
-- Passwords are stored as BCrypt hashes (never plaintext).
-- Role is enforced at application layer (RBAC); this table is the source of truth.

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    role             VARCHAR(50)  NOT NULL,
    active           BOOLEAN      NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'VENDOR', 'FISHERMAN'))
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_active ON users (active) WHERE active = true;

COMMENT ON TABLE users IS 'Application users; password_hash is BCrypt.';
COMMENT ON COLUMN users.role IS 'ADMIN, VENDOR, or FISHERMAN for RBAC.';
