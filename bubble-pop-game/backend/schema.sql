-- Drop Merge leaderboard schema (Cloudflare D1 / SQLite)
-- One row per device: the player's best score. Upserts keep the max.

CREATE TABLE IF NOT EXISTS scores (
  device_id  TEXT PRIMARY KEY,
  name       TEXT    NOT NULL,
  country    TEXT    NOT NULL,
  region     TEXT    NOT NULL,
  score      INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_score   ON scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_country ON scores (country, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_region  ON scores (region, score DESC);
