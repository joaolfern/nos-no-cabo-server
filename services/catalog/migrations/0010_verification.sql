-- Consecutive re-check misses; two in a row remove the badge (ADR 0001).
ALTER TABLE websites ADD COLUMN verification_misses INTEGER NOT NULL DEFAULT 0;

CREATE INDEX websites_by_verification_check ON websites (last_verification_check_at)
  WHERE verified_at IS NOT NULL;

-- Published sites from the seed never went through moderation, so they have no short code yet.
-- A collision leaves that row without a code; the review script's approve fills it later.
UPDATE OR IGNORE websites SET short_code = lower(hex(randomblob(3)))
  WHERE status = 'published' AND short_code IS NULL;
