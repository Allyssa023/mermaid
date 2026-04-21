-- Allow 'SOLD' as a valid catch_alerts status
ALTER TABLE catch_alerts DROP CONSTRAINT chk_catch_alerts_status;
ALTER TABLE catch_alerts ADD CONSTRAINT chk_catch_alerts_status
    CHECK (status IN ('ACTIVE','MATCHED','EXPIRED','CANCELLED','SOLD'));
