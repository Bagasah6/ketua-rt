CREATE TABLE IF NOT EXISTS stats_snapshot (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
