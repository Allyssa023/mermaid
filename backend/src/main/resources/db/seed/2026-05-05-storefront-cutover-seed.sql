-- Demo seed: one inventory_lot per demo vendor + one storefront_listing linked via storefront_listing_lots
-- Run AFTER V36 has been applied: psql -d mermaid_db -f backend/src/main/resources/db/seed/2026-05-05-storefront-cutover-seed.sql
-- Idempotent — guarded by WHERE NOT EXISTS on each insert.

DO $$
DECLARE
    v_vendor_id   BIGINT;
    v_species_id  BIGINT;
    v_lot_id      BIGINT;
    v_listing_id  BIGINT;
BEGIN
    -- Resolve demo vendor
    SELECT id INTO v_vendor_id FROM users WHERE email = 'vendor@mermaid.local' LIMIT 1;
    IF v_vendor_id IS NULL THEN
        RAISE NOTICE 'Demo vendor not found — skipping storefront seed.';
        RETURN;
    END IF;

    -- Pick first active species (e.g., Bangus / Milkfish)
    SELECT id INTO v_species_id FROM fish_species WHERE active = true ORDER BY id LIMIT 1;
    IF v_species_id IS NULL THEN
        RAISE NOTICE 'No active species found — skipping storefront seed.';
        RETURN;
    END IF;

    -- Insert inventory lot (idempotent via source_procurement_order_id IS NULL guard)
    SELECT id INTO v_lot_id
    FROM inventory_lots
    WHERE vendor_id = v_vendor_id
      AND species_id = v_species_id
      AND source_procurement_order_id IS NULL
      AND initial_kg = 20.00
    LIMIT 1;

    IF v_lot_id IS NULL THEN
        INSERT INTO inventory_lots
            (vendor_id, species_id, initial_kg, remaining_kg, cost_per_kg, received_at, created_at)
        VALUES
            (v_vendor_id, v_species_id, 20.00, 20.00, 150.00, now(), now())
        RETURNING id INTO v_lot_id;

        INSERT INTO inventory_movements (lot_id, delta_kg, reason, created_at)
        VALUES (v_lot_id, 20.00, 'PROCUREMENT_RECEIVED', now());
    END IF;

    -- Insert storefront listing (idempotent)
    SELECT id INTO v_listing_id
    FROM storefront_listings
    WHERE vendor_id = v_vendor_id
      AND species_id = v_species_id
      AND is_deleted = false
      AND title = 'Fresh Catch — Demo Listing'
    LIMIT 1;

    IF v_listing_id IS NULL THEN
        INSERT INTO storefront_listings
            (vendor_id, species_id, title, description, price_per_kg, min_qty_kg, status, is_deleted, created_at, updated_at)
        VALUES
            (v_vendor_id, v_species_id,
             'Fresh Catch — Demo Listing',
             'Demo storefront listing seeded for buyer marketplace cutover testing.',
             220.00, 0.5, 'PUBLISHED', false, now(), now())
        RETURNING id INTO v_listing_id;

        INSERT INTO storefront_listing_lots (listing_id, lot_id)
        VALUES (v_listing_id, v_lot_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Seed complete: vendor=% species=% lot=% listing=%',
        v_vendor_id, v_species_id, v_lot_id, v_listing_id;
END;
$$;
