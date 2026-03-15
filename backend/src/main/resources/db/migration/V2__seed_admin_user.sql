-- Optional: seed one ADMIN user for initial setup.
-- Default password: password (MUST be changed in production; dev only).
-- BCrypt hash at cost 10. Remove or override in production.

INSERT INTO users (email, password_hash, full_name, role, active)
VALUES (
    'admin@mermaid.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'System Admin',
    'ADMIN',
    true
)
ON CONFLICT (email) DO NOTHING;
