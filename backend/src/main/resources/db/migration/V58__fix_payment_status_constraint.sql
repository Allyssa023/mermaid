-- Fix payment status constraint to allow SETTLED
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE payments ADD CONSTRAINT chk_payment_status CHECK (status IN ('PENDING','CONFIRMED','DISPUTED','SETTLED'));
