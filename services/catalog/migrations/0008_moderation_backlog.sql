-- Sites whose AI check waits for the next day's budget; the moderation Worker's cron re-queues them.
CREATE TABLE moderation_backlog (
  website_id TEXT PRIMARY KEY REFERENCES websites (id) ON DELETE CASCADE,
  deferred_at INTEGER NOT NULL
);

CREATE INDEX moderation_backlog_by_age ON moderation_backlog (deferred_at, website_id);
