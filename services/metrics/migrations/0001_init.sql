-- One row per visitor per site per day (ADR 0006). Only a new row counts, so repeats are free.
-- Rows older than today are deleted by the hourly cron; the totals below keep the counts.
CREATE TABLE visits (
  website_id TEXT NOT NULL,
  day TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('click', 'referral')),
  PRIMARY KEY (website_id, day, visitor_hash, kind)
) WITHOUT ROWID;

CREATE TABLE daily_stats (
  website_id TEXT NOT NULL,
  day TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  referrals INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (website_id, day)
) WITHOUT ROWID;

CREATE INDEX daily_stats_by_day ON daily_stats (day);

CREATE TABLE site_totals (
  website_id TEXT PRIMARY KEY,
  clicks INTEGER NOT NULL DEFAULT 0,
  referrals INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;

CREATE TABLE votes (
  website_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (website_id, voter_hash)
) WITHOUT ROWID;

CREATE TRIGGER visits_count AFTER INSERT ON visits BEGIN
  INSERT INTO daily_stats (website_id, day, clicks, referrals)
  VALUES (NEW.website_id, NEW.day, NEW.kind = 'click', NEW.kind = 'referral')
  ON CONFLICT (website_id, day) DO UPDATE SET
    clicks = clicks + excluded.clicks,
    referrals = referrals + excluded.referrals;
  INSERT INTO site_totals (website_id, clicks, referrals)
  VALUES (NEW.website_id, NEW.kind = 'click', NEW.kind = 'referral')
  ON CONFLICT (website_id) DO UPDATE SET
    clicks = clicks + excluded.clicks,
    referrals = referrals + excluded.referrals;
END;

CREATE TRIGGER votes_insert AFTER INSERT ON votes BEGIN
  INSERT INTO site_totals (website_id, likes, dislikes)
  VALUES (NEW.website_id, NEW.value = 1, NEW.value = -1)
  ON CONFLICT (website_id) DO UPDATE SET
    likes = likes + excluded.likes,
    dislikes = dislikes + excluded.dislikes;
END;

CREATE TRIGGER votes_update AFTER UPDATE OF value ON votes BEGIN
  UPDATE site_totals SET
    likes = likes + (NEW.value = 1) - (OLD.value = 1),
    dislikes = dislikes + (NEW.value = -1) - (OLD.value = -1)
  WHERE website_id = NEW.website_id;
END;

CREATE TRIGGER votes_delete AFTER DELETE ON votes BEGIN
  UPDATE site_totals SET
    likes = likes - (OLD.value = 1),
    dislikes = dislikes - (OLD.value = -1)
  WHERE website_id = OLD.website_id;
END;
