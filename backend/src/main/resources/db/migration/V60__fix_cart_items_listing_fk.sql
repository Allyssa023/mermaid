DELETE FROM cart_items;

-- Drop all possible FK names (Hibernate naming is non-deterministic)
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_listing_id;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_listing_id_fkey;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_listing;

ALTER TABLE cart_items
    ADD CONSTRAINT fk_cart_items_storefront_listing
    FOREIGN KEY (listing_id) REFERENCES storefront_listings(id);
