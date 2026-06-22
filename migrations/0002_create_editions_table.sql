-- Archive table for published NewspaperEdition JSON.
-- One row per edition_date. The full edition blob is stored as JSON text so
-- it can be served by Pages Functions without rebuilding the site.

CREATE TABLE IF NOT EXISTS editions (
  edition_date TEXT PRIMARY KEY,
  edition_json TEXT NOT NULL,
  status TEXT NOT NULL,
  story_count INTEGER NOT NULL,
  lead_headline TEXT NOT NULL,
  categories TEXT NOT NULL, -- JSON array, e.g. '["world","business"]'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_editions_created_at ON editions (created_at DESC);
