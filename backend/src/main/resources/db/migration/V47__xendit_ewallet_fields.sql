ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gcash_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS maya_number VARCHAR(20);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_method;
ALTER TABLE payments ADD CONSTRAINT chk_payment_method
    CHECK (method IN (
        'CASH','GCASH','MAYA','COD','CREDIT','BANK_TRANSFER','STUB',
        'PAYMAYA','PH_GCASH','PH_PAYMAYA','CARD'
    ));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_payment_method;
ALTER TABLE orders ADD CONSTRAINT chk_order_payment_method
    CHECK (payment_method IN ('CASH','CREDIT','GCASH','PAYMAYA','CARD') OR payment_method IS NULL);
