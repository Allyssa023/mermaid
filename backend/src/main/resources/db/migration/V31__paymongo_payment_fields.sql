-- V31: Add PayMongo payment gateway fields to payments table
-- Phase 3.1: PayMongo integration

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS source_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway VARCHAR(20) DEFAULT 'CASH';
