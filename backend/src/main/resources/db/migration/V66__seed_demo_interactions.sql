-- Seed connected demo interactions across roles so the dashboards are populated
-- without manual clicking. Idempotent: guards every insert so re-running the
-- migration (e.g. after baseline) won't duplicate. Designed to be removed or
-- skipped in production via Flyway placeholders / repeatable scripts later.
--
-- Adds:
--   * 2 extra fishermen, 1 extra vendor, 1 extra buyer (passwords = "password")
--   * Active + sold catch alerts
--   * Deals in NEGOTIATING / AGREED / REJECTED states with multi-turn proposals + chat
--   * Procurement orders (vendor buying from fisherman) with handoff + payment
--   * Storefront listings backed by inventory lots from the procurement orders
--   * Retail orders from buyer to vendor at PENDING / CONFIRMED / COMPLETED
--   * One review on a completed order
--
-- All inserts gate on the supporting V25 demo accounts existing — if V25 was
-- removed this file is a no-op.

DO $seed$
DECLARE
    pw_hash  CONSTANT TEXT := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; -- "password"

    f1_id BIGINT; -- fisherman@mermaid.local  (V25)
    f2_id BIGINT;
    f3_id BIGINT;
    v1_id BIGINT; -- vendor@mermaid.local     (V25)
    v2_id BIGINT;
    b1_id BIGINT; -- buyer@mermaid.local      (V25)
    b2_id BIGINT;

    sp_bangus      BIGINT;
    sp_galunggong  BIGINT;
    sp_tilapia     BIGINT;
    sp_lapulapu    BIGINT;
    sp_tanigue     BIGINT;

    loc_sanfern    BIGINT;
    loc_bauang     BIGINT;
    loc_agoo       BIGINT;

    ca1_id BIGINT; -- active alert (will sit on feed)
    ca2_id BIGINT; -- alert with NEGOTIATING deal
    ca3_id BIGINT; -- alert with AGREED deal -> order
    ca4_id BIGINT; -- alert with REJECTED deal
    ca5_id BIGINT; -- sold alert (claimed_kg = quantity_kg)
    ca6_id BIGINT; -- second active alert from f3

    d_neg_id BIGINT;
    d_agr_id BIGINT;
    d_rej_id BIGINT;

    prop_neg_pending_id BIGINT;
    prop_agr_accepted_id BIGINT;
    prop_rej_id BIGINT;

    proc_order_id BIGINT;     -- procurement order from AGREED deal
    handoff_id    BIGINT;

    lot_id BIGINT;            -- inventory lot from proc_order

    sl_bangus_id  BIGINT;
    sl_galunggong_id BIGINT;
    sl_tanigue_id BIGINT;

    retail_pending_id BIGINT;
    retail_confirmed_id BIGINT;
    retail_completed_id BIGINT;
BEGIN
    -- ── Users ────────────────────────────────────────────────────────────────
    INSERT INTO users (email, password_hash, full_name, role, active, email_verified, vessel_name, landing_site)
    VALUES
      ('fisherman2@mermaid.local', pw_hash, 'Mang Tino Alcantara', 'FISHERMAN', true, true, 'F/B Maria Clara', 'Poro Point'),
      ('fisherman3@mermaid.local', pw_hash, 'Ka Berting Liwanag',  'FISHERMAN', true, true, 'F/B Sirena',      'San Fernando')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO users (email, password_hash, full_name, role, active, email_verified)
    VALUES
      ('vendor2@mermaid.local', pw_hash, 'Aling Nena Bautista', 'VENDOR', true, true),
      ('buyer2@mermaid.local',  pw_hash, 'Marites Domingo',     'BUYER',  true, true)
    ON CONFLICT (email) DO NOTHING;

    SELECT id INTO f1_id FROM users WHERE email = 'fisherman@mermaid.local';
    SELECT id INTO f2_id FROM users WHERE email = 'fisherman2@mermaid.local';
    SELECT id INTO f3_id FROM users WHERE email = 'fisherman3@mermaid.local';
    SELECT id INTO v1_id FROM users WHERE email = 'vendor@mermaid.local';
    SELECT id INTO v2_id FROM users WHERE email = 'vendor2@mermaid.local';
    SELECT id INTO b1_id FROM users WHERE email = 'buyer@mermaid.local';
    SELECT id INTO b2_id FROM users WHERE email = 'buyer2@mermaid.local';

    IF f1_id IS NULL OR v1_id IS NULL OR b1_id IS NULL THEN
        RAISE NOTICE 'V25 demo users missing — skipping V66 seed.';
        RETURN;
    END IF;

    -- ── Reference lookups ────────────────────────────────────────────────────
    SELECT id INTO sp_bangus     FROM fish_species WHERE common_name = 'Bangus'     LIMIT 1;
    SELECT id INTO sp_galunggong FROM fish_species WHERE common_name = 'Galunggong' LIMIT 1;
    SELECT id INTO sp_tilapia    FROM fish_species WHERE common_name = 'Tilapia'    LIMIT 1;
    SELECT id INTO sp_lapulapu   FROM fish_species WHERE common_name = 'Lapu-lapu'  LIMIT 1;
    SELECT id INTO sp_tanigue    FROM fish_species WHERE common_name = 'Tanigue'    LIMIT 1;

    SELECT id INTO loc_sanfern FROM market_locations WHERE municipality = 'City of San Fernando' LIMIT 1;
    SELECT id INTO loc_bauang  FROM market_locations WHERE municipality = 'Bauang' LIMIT 1;
    SELECT id INTO loc_agoo    FROM market_locations WHERE municipality = 'Agoo'   LIMIT 1;

    IF sp_bangus IS NULL OR sp_galunggong IS NULL THEN
        RAISE NOTICE 'Reference fish species missing — skipping V66 seed.';
        RETURN;
    END IF;

    -- ── Catch alerts ─────────────────────────────────────────────────────────
    -- Use email+species+landing_site as a "natural key" to avoid duplicates on
    -- repeated migration runs.
    SELECT id INTO ca1_id FROM catch_alerts WHERE fisherman_id = f1_id AND species_id = sp_bangus AND landing_site = 'Poro Point' LIMIT 1;
    IF ca1_id IS NULL THEN
        INSERT INTO catch_alerts (fisherman_id, species_id, quantity_kg, landing_site, asking_price_per_kg, notes, status, expires_at, lat, lng)
        VALUES (f1_id, sp_bangus, 40, 'Poro Point', 175.00, 'Fresh catch, on ice since 4am.', 'ACTIVE', NOW() + INTERVAL '12 hours', 16.6157, 120.3209)
        RETURNING id INTO ca1_id;
    END IF;

    SELECT id INTO ca2_id FROM catch_alerts WHERE fisherman_id = f1_id AND species_id = sp_galunggong AND landing_site = 'San Fernando' LIMIT 1;
    IF ca2_id IS NULL THEN
        INSERT INTO catch_alerts (fisherman_id, species_id, quantity_kg, landing_site, asking_price_per_kg, notes, status, expires_at, lat, lng)
        VALUES (f1_id, sp_galunggong, 80, 'San Fernando', 140.00, 'Big haul today.', 'ACTIVE', NOW() + INTERVAL '10 hours', 16.6159, 120.3162)
        RETURNING id INTO ca2_id;
    END IF;

    SELECT id INTO ca3_id FROM catch_alerts WHERE fisherman_id = f2_id AND species_id = sp_tanigue AND landing_site = 'Bauang' LIMIT 1;
    IF ca3_id IS NULL AND f2_id IS NOT NULL THEN
        INSERT INTO catch_alerts (fisherman_id, species_id, quantity_kg, landing_site, asking_price_per_kg, notes, status, expires_at, lat, lng, claimed_kg)
        VALUES (f2_id, sp_tanigue, 25, 'Bauang', 310.00, 'Whole tanigue, 1.5-2kg pcs.', 'MATCHED', NOW() + INTERVAL '8 hours', 16.5318, 120.3338, 20)
        RETURNING id INTO ca3_id;
    END IF;

    SELECT id INTO ca4_id FROM catch_alerts WHERE fisherman_id = f2_id AND species_id = sp_lapulapu AND landing_site = 'Bauang' LIMIT 1;
    IF ca4_id IS NULL AND f2_id IS NOT NULL THEN
        INSERT INTO catch_alerts (fisherman_id, species_id, quantity_kg, landing_site, asking_price_per_kg, notes, status, expires_at, lat, lng)
        VALUES (f2_id, sp_lapulapu, 12, 'Bauang', 580.00, 'Live grouper, premium ask.', 'ACTIVE', NOW() + INTERVAL '14 hours', 16.5318, 120.3338)
        RETURNING id INTO ca4_id;
    END IF;

    SELECT id INTO ca5_id FROM catch_alerts WHERE fisherman_id = f3_id AND species_id = sp_tilapia LIMIT 1;
    IF ca5_id IS NULL AND f3_id IS NOT NULL THEN
        INSERT INTO catch_alerts (fisherman_id, species_id, quantity_kg, landing_site, asking_price_per_kg, notes, status, expires_at, claimed_kg)
        VALUES (f3_id, sp_tilapia, 30, 'San Fernando', 100.00, 'Sold out within 2 hours.', 'SOLD', NOW() - INTERVAL '2 days', 30)
        RETURNING id INTO ca5_id;
    END IF;

    SELECT id INTO ca6_id FROM catch_alerts WHERE fisherman_id = f3_id AND species_id = sp_bangus LIMIT 1;
    IF ca6_id IS NULL AND f3_id IS NOT NULL THEN
        INSERT INTO catch_alerts (fisherman_id, species_id, quantity_kg, landing_site, asking_price_per_kg, notes, status, expires_at, lat, lng)
        VALUES (f3_id, sp_bangus, 55, 'Agoo', 165.00, 'Just docked. First come.', 'ACTIVE', NOW() + INTERVAL '9 hours', 16.3290, 120.3676)
        RETURNING id INTO ca6_id;
    END IF;

    -- ── Deal 1: NEGOTIATING with 2 proposals (last one PENDING from vendor) ──
    SELECT id INTO d_neg_id FROM deals WHERE vendor_id = v1_id AND catch_alert_id = ca2_id AND status = 'NEGOTIATING' LIMIT 1;
    IF d_neg_id IS NULL THEN
        INSERT INTO deals (catch_alert_id, vendor_id, fisherman_id, status, expires_at, fisherman_engaged_at, created_at)
        VALUES (ca2_id, v1_id, f1_id, 'NEGOTIATING', NOW() + INTERVAL '8 hours', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '45 minutes')
        RETURNING id INTO d_neg_id;

        -- Fisherman's opening proposal (now superseded by vendor's counter)
        INSERT INTO deal_proposals (deal_id, proposed_by_id, qty_kg, price_per_kg, status, superseded_reason, responded_by_id, responded_at, created_at)
        VALUES (d_neg_id, f1_id, 30, 140.00, 'SUPERSEDED', 'NEW_PROPOSAL', v1_id, NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '45 minutes');

        -- Vendor's counter — currently pending
        INSERT INTO deal_proposals (deal_id, proposed_by_id, qty_kg, price_per_kg, status, created_at)
        VALUES (d_neg_id, v1_id, 30, 128.00, 'PENDING', NOW() - INTERVAL '25 minutes')
        RETURNING id INTO prop_neg_pending_id;

        -- Chat history
        INSERT INTO messages (sender_id, recipient_id, deal_id, content, sent_at)
        VALUES
          (v1_id, f1_id, d_neg_id, 'Hi Isidro, interested in your galunggong. Can we do 30kg?', NOW() - INTERVAL '40 minutes'),
          (f1_id, v1_id, d_neg_id, 'Yes sir, P140/kg.',                                          NOW() - INTERVAL '35 minutes'),
          (v1_id, f1_id, d_neg_id, 'P128 lang po, regular ako diba.',                            NOW() - INTERVAL '25 minutes');
    END IF;

    -- ── Deal 2: AGREED, generated an order, handoff confirmed, payment SETTLED
    SELECT id INTO d_agr_id FROM deals WHERE vendor_id = v1_id AND catch_alert_id = ca3_id LIMIT 1;
    IF d_agr_id IS NULL AND ca3_id IS NOT NULL THEN
        INSERT INTO deals (catch_alert_id, vendor_id, fisherman_id, status, agreed_qty_kg, agreed_price_per_kg, agreed_at, fisherman_engaged_at, expires_at, closed_at, created_at)
        VALUES (ca3_id, v1_id, f2_id, 'AGREED', 20, 315.00, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '4 hours')
        RETURNING id INTO d_agr_id;

        INSERT INTO deal_proposals (deal_id, proposed_by_id, qty_kg, price_per_kg, status, responded_by_id, responded_at, created_at)
        VALUES (d_agr_id, v1_id, 20, 315.00, 'ACCEPTED', f2_id, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours 30 minutes')
        RETURNING id INTO prop_agr_accepted_id;

        INSERT INTO messages (sender_id, recipient_id, deal_id, content, sent_at)
        VALUES
          (v1_id, f2_id, d_agr_id, 'Tinong, kunin ko lahat ng tanigue mo today.',          NOW() - INTERVAL '4 hours'),
          (f2_id, v1_id, d_agr_id, 'Sige Aling Rosa. P315 ok ba? Maganda quality.',          NOW() - INTERVAL '3 hours 45 minutes'),
          (v1_id, f2_id, d_agr_id, 'Deal. Pickup later 4pm sa Bauang dock.',                NOW() - INTERVAL '3 hours 30 minutes');

        -- Procurement order (vendor buys from fisherman). Note: orders table no
        -- longer distinguishes vendor purchases at the API level (single retail
        -- flow), but the schema still accepts buyer_id=vendor, seller_id=fisher.
        INSERT INTO orders (buyer_id, seller_id, catch_alert_id, species_id, ordered_qty_kg, agreed_price_per_kg, dispatch_mode, status, order_kind, deal_id, payment_method, settled_at, settle_notes, completed_at, created_at)
        VALUES (v1_id, f2_id, ca3_id, sp_tanigue, 20, 315.00, 'PICKUP', 'COMPLETED', 'PROCUREMENT', d_agr_id, 'CASH', NOW() - INTERVAL '1 hour', 'Settled at dock', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 hours')
        RETURNING id INTO proc_order_id;

        UPDATE deals SET order_id = proc_order_id WHERE id = d_agr_id;

        INSERT INTO handoff_confirmations (order_id, actual_qty_kg, final_price_per_kg, total_amount, confirmed_by_buyer, confirmed_by_seller, status, confirmed_at, created_at)
        VALUES (proc_order_id, 20, 315.00, 6300.00, true, true, 'CONFIRMED', NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 hour 45 minutes')
        RETURNING id INTO handoff_id;

        INSERT INTO payments (order_id, handoff_id, payer_id, payee_id, amount, method, status, paid_at, created_at)
        VALUES (proc_order_id, handoff_id, v1_id, f2_id, 6300.00, 'CASH', 'SETTLED', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour 15 minutes');

        -- Inventory lot from this procurement
        INSERT INTO inventory_lots (vendor_id, species_id, source_procurement_order_id, initial_kg, remaining_kg, cost_per_kg, received_at)
        VALUES (v1_id, sp_tanigue, proc_order_id, 20, 14, 315.00, NOW() - INTERVAL '1 hour')
        RETURNING id INTO lot_id;

        INSERT INTO inventory_movements (lot_id, delta_kg, reason, ref_order_id, note)
        VALUES (lot_id, 20, 'PROCUREMENT_RECEIVED', proc_order_id, 'Initial intake');
    END IF;

    -- ── Deal 3: REJECTED (fisherman declined vendor's lowball) ───────────────
    SELECT id INTO d_rej_id FROM deals WHERE vendor_id = v2_id AND catch_alert_id = ca4_id LIMIT 1;
    IF d_rej_id IS NULL AND ca4_id IS NOT NULL AND v2_id IS NOT NULL THEN
        INSERT INTO deals (catch_alert_id, vendor_id, fisherman_id, status, expires_at, closed_at, created_at)
        VALUES (ca4_id, v2_id, f2_id, 'REJECTED', NOW() + INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 hours')
        RETURNING id INTO d_rej_id;

        INSERT INTO deal_proposals (deal_id, proposed_by_id, qty_kg, price_per_kg, status, responded_by_id, responded_at, created_at)
        VALUES (d_rej_id, v2_id, 10, 400.00, 'REJECTED', f2_id, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 hours')
        RETURNING id INTO prop_rej_id;

        INSERT INTO messages (sender_id, recipient_id, deal_id, content, sent_at)
        VALUES
          (v2_id, f2_id, d_rej_id, 'P400 lang sir for the lapu-lapu?',                NOW() - INTERVAL '2 hours'),
          (f2_id, v2_id, d_rej_id, 'Pasensya na, hindi puwede. Live pa po yan.',      NOW() - INTERVAL '30 minutes');
    END IF;

    -- ── Storefront listings (vendor1 has tanigue from the procurement lot) ───
    SELECT id INTO sl_bangus_id FROM storefront_listings WHERE vendor_id = v1_id AND title = 'Fresh Bangus — Poro Point' LIMIT 1;
    IF sl_bangus_id IS NULL THEN
        INSERT INTO storefront_listings (vendor_id, species_id, title, description, price_per_kg, min_qty_kg, status)
        VALUES (v1_id, sp_bangus, 'Fresh Bangus — Poro Point', 'Sourced this morning, ice-packed.', 220.00, 1, 'PUBLISHED')
        RETURNING id INTO sl_bangus_id;
    END IF;

    SELECT id INTO sl_galunggong_id FROM storefront_listings WHERE vendor_id = v1_id AND title = 'Galunggong (medium)' LIMIT 1;
    IF sl_galunggong_id IS NULL THEN
        INSERT INTO storefront_listings (vendor_id, species_id, title, description, price_per_kg, min_qty_kg, status)
        VALUES (v1_id, sp_galunggong, 'Galunggong (medium)', 'Steady supply. Cleaned on request.', 180.00, 0.5, 'PUBLISHED')
        RETURNING id INTO sl_galunggong_id;
    END IF;

    SELECT id INTO sl_tanigue_id FROM storefront_listings WHERE vendor_id = v1_id AND title = 'Tanigue — whole 1-2kg' LIMIT 1;
    IF sl_tanigue_id IS NULL THEN
        INSERT INTO storefront_listings (vendor_id, species_id, title, description, price_per_kg, min_qty_kg, status)
        VALUES (v1_id, sp_tanigue, 'Tanigue — whole 1-2kg', 'From the morning catch off Bauang. Limited stock.', 380.00, 1, 'PUBLISHED')
        RETURNING id INTO sl_tanigue_id;

        IF lot_id IS NOT NULL THEN
            INSERT INTO storefront_listing_lots (listing_id, lot_id) VALUES (sl_tanigue_id, lot_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- ── Retail orders (buyer → vendor) ───────────────────────────────────────
    -- PENDING: buyer just placed, vendor hasn't confirmed
    SELECT id INTO retail_pending_id FROM orders WHERE buyer_id = b1_id AND seller_id = v1_id AND storefront_listing_id = sl_galunggong_id AND status = 'PENDING' LIMIT 1;
    IF retail_pending_id IS NULL THEN
        INSERT INTO orders (buyer_id, seller_id, storefront_listing_id, species_id, ordered_qty_kg, agreed_price_per_kg, dispatch_mode, status, order_kind, payment_method, created_at)
        VALUES (b1_id, v1_id, sl_galunggong_id, sp_galunggong, 2, 180.00, 'PICKUP', 'PENDING', 'RETAIL', 'CASH', NOW() - INTERVAL '10 minutes')
        RETURNING id INTO retail_pending_id;
    END IF;

    -- CONFIRMED: vendor accepted, awaiting handoff
    SELECT id INTO retail_confirmed_id FROM orders WHERE buyer_id = b2_id AND seller_id = v1_id AND storefront_listing_id = sl_bangus_id LIMIT 1;
    IF retail_confirmed_id IS NULL AND b2_id IS NOT NULL THEN
        INSERT INTO orders (buyer_id, seller_id, storefront_listing_id, species_id, ordered_qty_kg, agreed_price_per_kg, dispatch_mode, status, order_kind, payment_method, created_at)
        VALUES (b2_id, v1_id, sl_bangus_id, sp_bangus, 3, 220.00, 'DELIVERY', 'CONFIRMED', 'RETAIL', 'CASH', NOW() - INTERVAL '2 hours')
        RETURNING id INTO retail_confirmed_id;
    END IF;

    -- COMPLETED: full flow done, ready for review
    SELECT id INTO retail_completed_id FROM orders WHERE buyer_id = b1_id AND seller_id = v1_id AND storefront_listing_id = sl_tanigue_id AND status = 'COMPLETED' LIMIT 1;
    IF retail_completed_id IS NULL THEN
        INSERT INTO orders (buyer_id, seller_id, storefront_listing_id, species_id, ordered_qty_kg, agreed_price_per_kg, dispatch_mode, status, order_kind, payment_method, settled_at, settle_notes, completed_at, created_at)
        VALUES (b1_id, v1_id, sl_tanigue_id, sp_tanigue, 1.5, 380.00, 'PICKUP', 'COMPLETED', 'RETAIL', 'CASH', NOW() - INTERVAL '30 minutes', 'Paid in cash', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '5 hours')
        RETURNING id INTO retail_completed_id;

        INSERT INTO handoff_confirmations (order_id, actual_qty_kg, final_price_per_kg, total_amount, confirmed_by_buyer, confirmed_by_seller, status, confirmed_at, created_at)
        VALUES (retail_completed_id, 1.5, 380.00, 570.00, true, true, 'CONFIRMED', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '1 hour');

        INSERT INTO payments (order_id, payer_id, payee_id, amount, method, status, paid_at, created_at)
        VALUES (retail_completed_id, b1_id, v1_id, 570.00, 'CASH', 'SETTLED', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '40 minutes');

        -- Drain the inventory lot to reflect the sale
        IF lot_id IS NOT NULL THEN
            INSERT INTO inventory_movements (lot_id, delta_kg, reason, ref_order_id, note)
            VALUES (lot_id, -1.5, 'SALE_COMPLETED', retail_completed_id, 'Tanigue 1.5kg to buyer');
        END IF;
    END IF;

    -- ── One review on the completed order ────────────────────────────────────
    INSERT INTO reviews (order_id, reviewer_id, vendor_id, rating, comment)
    SELECT retail_completed_id, b1_id, v1_id, 5, 'Sariwa, hindi malansa. Salamat Aling Rosa!'
    WHERE retail_completed_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM reviews WHERE order_id = retail_completed_id);

    UPDATE users
       SET avg_rating  = 5.00,
           review_count = GREATEST(review_count, 1)
     WHERE id = v1_id
       AND EXISTS (SELECT 1 FROM reviews WHERE vendor_id = v1_id);

    -- ── Favorites ───────────────────────────────────────────────────────────
    -- Buyer 1 favorites vendor 1's bangus listing + vendor1 themselves
    INSERT INTO favorites (buyer_id, target_type, target_id)
    SELECT b1_id, 'LISTING', sl_bangus_id
    WHERE sl_bangus_id IS NOT NULL
    ON CONFLICT (buyer_id, target_type, target_id) DO NOTHING;

    INSERT INTO favorites (buyer_id, target_type, target_id)
    SELECT b1_id, 'VENDOR', v1_id
    ON CONFLICT (buyer_id, target_type, target_id) DO NOTHING;
END
$seed$;
