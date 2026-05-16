-- V43 declared `payment_method VARCHAR(10) DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'CREDIT'))`
-- as an inline column-level CHECK, which Postgres auto-named `orders_payment_method_check`.
-- V47 tried to widen the allowed values via a separately-named constraint `chk_order_payment_method`,
-- but only dropped `chk_order_payment_method` (which never existed) — leaving the original
-- `orders_payment_method_check` in place. Result: UPDATE orders SET payment_method='GCASH' fails
-- with the V43 constraint still rejecting anything except CASH/CREDIT.
--
-- Drop BOTH possible names (auto-named from V43 + the V47 name) and re-create with the full
-- Xendit-aware allowlist.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_payment_method;

ALTER TABLE orders ADD CONSTRAINT chk_order_payment_method
    CHECK (payment_method IN ('CASH','CREDIT','GCASH','PAYMAYA','CARD','PH_GCASH','PH_PAYMAYA')
           OR payment_method IS NULL);
