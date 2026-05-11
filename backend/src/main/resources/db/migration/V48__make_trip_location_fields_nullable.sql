ALTER TABLE trips
    ALTER COLUMN departure_point DROP NOT NULL,
    ALTER COLUMN target_area     DROP NOT NULL;
