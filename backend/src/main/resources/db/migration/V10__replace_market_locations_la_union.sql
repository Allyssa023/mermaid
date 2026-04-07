-- Replace generic Philippines market locations with La Union-specific wet markets.
-- Soft-deletes the original Metro Manila / Cebu seed data and inserts La Union locations.

UPDATE market_locations SET active = false
WHERE municipality IN ('Navotas', 'Manila', 'Quezon City', 'Cebu City');

INSERT INTO market_locations (name, municipality, province) VALUES
    -- San Fernando City — strongest formal market infrastructure
    ('City Public Market',                'City of San Fernando', 'La Union'),
    ('Auxiliary Wet Market',              'City of San Fernando', 'La Union'),
    ('Community Fish Landing Center',     'City of San Fernando', 'La Union'),
    -- Luna & Balaoan — known fish landing centers
    ('Community Fish Landing Center',     'Luna',                 'La Union'),
    ('Community Fish Landing Center',     'Balaoan',              'La Union'),
    -- Tier 1 municipalities — highest production and fisherman concentration
    ('Sto. Tomas Public Market',          'Sto. Tomas',           'La Union'),
    ('Aringay Public Market',             'Aringay',              'La Union'),
    ('Agoo Public Market',                'Agoo',                 'La Union'),
    ('Rosario Public Market',             'Rosario',              'La Union'),
    -- Tier 2 municipalities
    ('Bacnotan Public Market',            'Bacnotan',             'La Union'),
    ('Bauang Public Market',              'Bauang',               'La Union')
ON CONFLICT (name, municipality) DO NOTHING;
