-- V14: Add auth verification fields for email verification, password reset, and OTP

ALTER TABLE users
  ADD COLUMN email_verified         BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN verification_token     VARCHAR(128),
  ADD COLUMN verification_token_exp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN reset_token            VARCHAR(128),
  ADD COLUMN reset_token_exp        TIMESTAMP WITH TIME ZONE,
  ADD COLUMN otp_code               VARCHAR(6),
  ADD COLUMN otp_code_exp           TIMESTAMP WITH TIME ZONE;

-- Backfill: existing users pre-date the email verification feature → mark as verified
UPDATE users SET email_verified = true;
