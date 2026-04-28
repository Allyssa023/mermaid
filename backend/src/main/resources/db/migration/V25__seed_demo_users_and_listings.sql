-- Dev seed: one demo user per role. Password for all accounts: password
-- BCrypt cost-10 hash of "password"
-- Remove or override before deploying to production.

INSERT INTO users (email, password_hash, full_name, role, active, email_verified)
VALUES
    ('fisherman@mermaid.local',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
     'Isidro dela Cruz', 'FISHERMAN', true, true),

    ('vendor@mermaid.local',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
     'Rosario Santos', 'VENDOR', true, true),

    ('buyer@mermaid.local',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
     'Carlos Reyes', 'BUYER', true, true)
ON CONFLICT (email) DO NOTHING;

-- Seed vendor demand listings so the buyer dashboard is not empty.
-- Uses subqueries keyed on name/email so IDs do not need to be hardcoded.

INSERT INTO demand_listings
    (vendor_id, species_id, location_id,
     quantity_kg, offer_price_per_kg, needed_by, notes, status)
SELECT
    (SELECT id FROM users           WHERE email        = 'vendor@mermaid.local'),
    (SELECT id FROM fish_species    WHERE common_name  = 'Bangus'     LIMIT 1),
    (SELECT id FROM market_locations WHERE municipality = 'City of San Fernando' LIMIT 1),
    50.0, 180.00,
    NOW() + INTERVAL '3 days',
    'Fresh bangus only. Will pick up at dock.',
    'OPEN'
WHERE EXISTS (SELECT 1 FROM users            WHERE email       = 'vendor@mermaid.local')
  AND EXISTS (SELECT 1 FROM fish_species     WHERE common_name = 'Bangus')
  AND EXISTS (SELECT 1 FROM market_locations WHERE municipality = 'City of San Fernando');

INSERT INTO demand_listings
    (vendor_id, species_id, location_id,
     quantity_kg, offer_price_per_kg, needed_by, notes, status)
SELECT
    (SELECT id FROM users            WHERE email        = 'vendor@mermaid.local'),
    (SELECT id FROM fish_species     WHERE common_name  = 'Galunggong' LIMIT 1),
    (SELECT id FROM market_locations WHERE municipality = 'City of San Fernando' LIMIT 1),
    30.0, 140.00,
    NOW() + INTERVAL '2 days',
    'Medium-sized galunggong preferred.',
    'OPEN'
WHERE EXISTS (SELECT 1 FROM users            WHERE email       = 'vendor@mermaid.local')
  AND EXISTS (SELECT 1 FROM fish_species     WHERE common_name = 'Galunggong')
  AND EXISTS (SELECT 1 FROM market_locations WHERE municipality = 'City of San Fernando');

INSERT INTO demand_listings
    (vendor_id, species_id, location_id,
     quantity_kg, offer_price_per_kg, needed_by, notes, status)
SELECT
    (SELECT id FROM users            WHERE email        = 'vendor@mermaid.local'),
    (SELECT id FROM fish_species     WHERE common_name  = 'Tilapia'   LIMIT 1),
    (SELECT id FROM market_locations WHERE municipality = 'Agoo'      LIMIT 1),
    80.0, 95.00,
    NOW() + INTERVAL '5 days',
    NULL,
    'OPEN'
WHERE EXISTS (SELECT 1 FROM users            WHERE email       = 'vendor@mermaid.local')
  AND EXISTS (SELECT 1 FROM fish_species     WHERE common_name = 'Tilapia')
  AND EXISTS (SELECT 1 FROM market_locations WHERE municipality = 'Agoo');

INSERT INTO demand_listings
    (vendor_id, species_id, location_id,
     quantity_kg, offer_price_per_kg, needed_by, notes, status)
SELECT
    (SELECT id FROM users            WHERE email        = 'vendor@mermaid.local'),
    (SELECT id FROM fish_species     WHERE common_name  = 'Lapu-lapu' LIMIT 1),
    (SELECT id FROM market_locations WHERE municipality = 'Bauang'    LIMIT 1),
    15.0, 550.00,
    NOW() + INTERVAL '1 day',
    'Live or very fresh only. Premium price for quality.',
    'OPEN'
WHERE EXISTS (SELECT 1 FROM users            WHERE email       = 'vendor@mermaid.local')
  AND EXISTS (SELECT 1 FROM fish_species     WHERE common_name = 'Lapu-lapu')
  AND EXISTS (SELECT 1 FROM market_locations WHERE municipality = 'Bauang');

INSERT INTO demand_listings
    (vendor_id, species_id, location_id,
     quantity_kg, offer_price_per_kg, needed_by, notes, status)
SELECT
    (SELECT id FROM users            WHERE email        = 'vendor@mermaid.local'),
    (SELECT id FROM fish_species     WHERE common_name  = 'Tanigue'   LIMIT 1),
    (SELECT id FROM market_locations WHERE municipality = 'Bacnotan'  LIMIT 1),
    25.0, 320.00,
    NOW() + INTERVAL '4 days',
    'Whole fish, minimum 1 kg each.',
    'OPEN'
WHERE EXISTS (SELECT 1 FROM users            WHERE email       = 'vendor@mermaid.local')
  AND EXISTS (SELECT 1 FROM fish_species     WHERE common_name = 'Tanigue')
  AND EXISTS (SELECT 1 FROM market_locations WHERE municipality = 'Bacnotan');
