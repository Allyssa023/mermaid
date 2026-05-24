-- Seed historical login_events for DAU chart (idempotent)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM login_events) >= 50 THEN
    RETURN;
  END IF;

  -- fisherman1 (~24 of last 30 days)
  INSERT INTO login_events (user_id, logged_in_at)
  SELECT u.id, CURRENT_TIMESTAMP - (n || ' days')::INTERVAL
  FROM users u,
       unnest(ARRAY[0,1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29]) AS n
  WHERE u.email = 'fisherman1@demo.com'
  ON CONFLICT DO NOTHING;

  -- fisherman2 (~22 of last 30 days)
  INSERT INTO login_events (user_id, logged_in_at)
  SELECT u.id, CURRENT_TIMESTAMP - (n || ' days')::INTERVAL
  FROM users u,
       unnest(ARRAY[0,1,2,3,5,6,7,8,9,10,11,13,14,15,16,17,19,20,21,22,24,25]) AS n
  WHERE u.email = 'fisherman2@demo.com'
  ON CONFLICT DO NOTHING;

  -- vendor1 (weekdays only, ~20 of last 30 days)
  INSERT INTO login_events (user_id, logged_in_at)
  SELECT u.id, CURRENT_TIMESTAMP - (n || ' days')::INTERVAL
  FROM users u,
       unnest(ARRAY[0,1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,24,25]) AS n
  WHERE u.email = 'vendor1@demo.com'
  ON CONFLICT DO NOTHING;

  -- vendor2 (weekdays, ~18 days)
  INSERT INTO login_events (user_id, logged_in_at)
  SELECT u.id, CURRENT_TIMESTAMP - (n || ' days')::INTERVAL
  FROM users u,
       unnest(ARRAY[1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,28]) AS n
  WHERE u.email = 'vendor2@demo.com'
  ON CONFLICT DO NOTHING;

  -- buyer1 (every 2-3 days, ~12 days)
  INSERT INTO login_events (user_id, logged_in_at)
  SELECT u.id, CURRENT_TIMESTAMP - (n || ' days')::INTERVAL
  FROM users u,
       unnest(ARRAY[0,2,5,7,10,12,15,17,20,22,25,28]) AS n
  WHERE u.email = 'buyer1@demo.com'
  ON CONFLICT DO NOTHING;

  -- buyer2 (~10 days)
  INSERT INTO login_events (user_id, logged_in_at)
  SELECT u.id, CURRENT_TIMESTAMP - (n || ' days')::INTERVAL
  FROM users u,
       unnest(ARRAY[1,4,6,9,13,16,19,23,26,29]) AS n
  WHERE u.email = 'buyer2@demo.com'
  ON CONFLICT DO NOTHING;

  -- admin (Mon + Thu pattern, ~8 days)
  INSERT INTO login_events (user_id, logged_in_at)
  SELECT u.id, CURRENT_TIMESTAMP - (n || ' days')::INTERVAL
  FROM users u,
       unnest(ARRAY[0,3,7,10,14,17,21,24]) AS n
  WHERE u.email = 'admin@demo.com'
  ON CONFLICT DO NOTHING;

END $$;
