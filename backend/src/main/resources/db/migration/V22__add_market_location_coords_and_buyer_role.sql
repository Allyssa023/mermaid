-- Add coordinate columns to market_locations
ALTER TABLE market_locations ADD COLUMN lat NUMERIC(9,6);
ALTER TABLE market_locations ADD COLUMN lng NUMERIC(9,6);

-- Seed GPS coordinates for active La Union markets
UPDATE market_locations SET lat = 16.6158, lng = 120.3168
    WHERE name = 'City Public Market' AND municipality = 'City of San Fernando';
UPDATE market_locations SET lat = 16.6120, lng = 120.3140
    WHERE name = 'Auxiliary Wet Market' AND municipality = 'City of San Fernando';
UPDATE market_locations SET lat = 16.6200, lng = 120.3200
    WHERE name = 'Community Fish Landing Center' AND municipality = 'City of San Fernando';
UPDATE market_locations SET lat = 16.6023, lng = 120.3943
    WHERE name = 'Community Fish Landing Center' AND municipality = 'Luna';
UPDATE market_locations SET lat = 16.5237, lng = 120.3925
    WHERE name = 'Community Fish Landing Center' AND municipality = 'Balaoan';
UPDATE market_locations SET lat = 16.4983, lng = 120.3883
    WHERE name = 'Sto. Tomas Public Market' AND municipality = 'Sto. Tomas';
UPDATE market_locations SET lat = 16.5553, lng = 120.3397
    WHERE name = 'Aringay Public Market' AND municipality = 'Aringay';
UPDATE market_locations SET lat = 16.5753, lng = 120.3703
    WHERE name = 'Agoo Public Market' AND municipality = 'Agoo';
UPDATE market_locations SET lat = 16.6667, lng = 120.4833
    WHERE name = 'Rosario Public Market' AND municipality = 'Rosario';
UPDATE market_locations SET lat = 16.7667, lng = 120.3667
    WHERE name = 'Bacnotan Public Market' AND municipality = 'Bacnotan';
UPDATE market_locations SET lat = 16.5328, lng = 120.3333
    WHERE name = 'Bauang Public Market' AND municipality = 'Bauang';

-- Update role CHECK constraint to include BUYER
-- NOTE: ACCESS EXCLUSIVE lock acquired — safe in dev, schedule on production
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('ADMIN', 'VENDOR', 'FISHERMAN', 'BUYER'));
