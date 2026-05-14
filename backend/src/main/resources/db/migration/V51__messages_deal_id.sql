ALTER TABLE messages ADD COLUMN deal_id BIGINT REFERENCES deals(id);
CREATE INDEX idx_messages_deal ON messages (deal_id);
