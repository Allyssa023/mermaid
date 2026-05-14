-- Backfill catch_alerts.asking_price_per_kg using the most recent BFAR reference
-- price midpoint per species. Species without any BFAR row fall back to 0.
UPDATE catch_alerts ca
SET asking_price_per_kg = latest.midpoint
FROM (
    SELECT DISTINCT ON (species_id)
        species_id,
        ROUND((min_price_per_kg + max_price_per_kg) / 2.0, 2) AS midpoint
    FROM bfar_reference_prices
    ORDER BY species_id, effective_date DESC
) latest
WHERE ca.asking_price_per_kg IS NULL
  AND ca.species_id = latest.species_id;

-- Catch alerts whose species has no BFAR row at all
UPDATE catch_alerts
SET asking_price_per_kg = 0
WHERE asking_price_per_kg IS NULL;
