-- Drop all existing role check constraints (V1 used chk_users_role; V22 added users_role_check)
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Single authoritative constraint that includes BUYER
ALTER TABLE users ADD CONSTRAINT chk_users_role
    CHECK (role IN ('ADMIN', 'VENDOR', 'FISHERMAN', 'BUYER'));
