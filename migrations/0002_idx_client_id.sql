CREATE INDEX IF NOT EXISTS idx_events_client ON events (client_id);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON events (event_name, created_at);
