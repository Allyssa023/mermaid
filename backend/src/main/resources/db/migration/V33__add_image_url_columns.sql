-- V33: Add image URL columns for file upload support
-- Phase 3.3: Avatars, listing photos

-- User avatar
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Listing photos (PostgreSQL text array)
ALTER TABLE demand_listings ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
