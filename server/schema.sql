CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  state TEXT NOT NULL,
  last_key TEXT,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS receipts (
  player TEXT NOT NULL,
  key TEXT NOT NULL,
  hash TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player, key)
);
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL
);
