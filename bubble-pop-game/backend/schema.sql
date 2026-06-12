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

-- Private Leagues (custom scoreboards shared via invite code)
CREATE TABLE IF NOT EXISTS boards (
  code         TEXT PRIMARY KEY,
  name         TEXT    NOT NULL,
  owner_device TEXT    NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS board_members (
  code       TEXT    NOT NULL,
  device_id  TEXT    NOT NULL,
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (code, device_id)
);

CREATE INDEX IF NOT EXISTS idx_board_members_code ON board_members (code);
