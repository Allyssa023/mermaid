-- Allow STUB as a valid payment method so the dev stub gateway doesn't violate the constraint.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_method;
ALTER TABLE payments ADD CONSTRAINT chk_payment_method
    CHECK (method IN ('CASH','GCASH','MAYA','COD','CREDIT','BANK_TRANSFER','STUB'));
