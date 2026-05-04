-- Group orders that originate from one cart checkout so the buyer's My Orders
-- view can collapse them into a single header per checkout.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS cart_checkout_id UUID;

CREATE INDEX IF NOT EXISTS idx_orders_cart_checkout_id
    ON orders (cart_checkout_id)
    WHERE cart_checkout_id IS NOT NULL;
