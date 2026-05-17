-- Add SETTLED to the payment status check constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE payments ADD CONSTRAINT chk_payment_status CHECK (status IN ('PENDING','CONFIRMED','DISPUTED','SETTLED'));
