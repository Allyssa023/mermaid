ALTER TABLE storefront_listings ADD COLUMN view_count INT NOT NULL DEFAULT 0;
CREATE INDEX idx_storefront_listings_view_count
  ON storefront_listings(view_count DESC)
  WHERE is_deleted = false;
