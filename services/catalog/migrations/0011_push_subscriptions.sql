-- Web Push for submitters who left the page: sent and deleted once moderation decides,
-- or deleted unsent after 7 days.
CREATE TABLE push_subscriptions (
  website_id TEXT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (website_id, endpoint)
);

CREATE INDEX push_subscriptions_by_created_at ON push_subscriptions (created_at);
