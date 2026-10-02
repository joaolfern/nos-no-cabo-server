-- Phase 8: sites waiting for a manual decision, and community reports.

ALTER TABLE websites ADD COLUMN review_flag TEXT
  CHECK (review_flag IN ('model_error', 'unreachable', 'reported'));

CREATE INDEX websites_by_review_flag ON websites (review_flag) WHERE review_flag IS NOT NULL;

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  website_id TEXT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  reason TEXT NOT NULL
    CHECK (reason IN ('inappropriate', 'spam', 'broken', 'impersonation', 'other')),
  comment TEXT,
  reporter_ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (website_id, reporter_ip_hash)
);
