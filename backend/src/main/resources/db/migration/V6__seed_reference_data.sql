-- Seed data for fish species and market locations.
-- Initial dataset covers common species in Philippine small-scale fisheries and metro/regional markets.

INSERT INTO fish_species (common_name, scientific_name) VALUES
    ('Bangus',      'Chanos chanos'),
    ('Tilapia',     'Oreochromis niloticus'),
    ('Galunggong',  'Decapterus macarellus'),
    ('Tanigue',     'Scomberomorus commerson'),
    ('Lapu-lapu',   'Epinephelus coioides'),
    ('Dilis',       'Stolephorus sp.'),
    ('Alumahan',    'Rastrelliger kanagurta'),
    ('Espada',      'Trichiurus lepturus'),
    ('Maya-maya',   'Lutjanus sebae'),
    ('Pampano',     'Trachinotus blochii')
ON CONFLICT (common_name) DO NOTHING;

INSERT INTO market_locations (name, municipality, province) VALUES
    ('Navotas Fish Port Complex', 'Navotas',      'Metro Manila'),
    ('Divisoria Market',          'Manila',        'Metro Manila'),
    ('Commonwealth Market',       'Quezon City',   'Metro Manila'),
    ('Carbon Market',             'Cebu City',     'Cebu'),
    ('Taboan Public Market',      'Cebu City',     'Cebu')
ON CONFLICT (name, municipality) DO NOTHING;
