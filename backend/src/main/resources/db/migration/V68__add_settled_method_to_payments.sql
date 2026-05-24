-- V68: Add settled_method column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS settled_method VARCHAR(50);
