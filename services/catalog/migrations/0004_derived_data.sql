-- Stored copies of values derived from websites and website_categories (ADR 0005).
-- Triggers keep them in sync for every writer; sql/rebuild-derived.sql recomputes them.

ALTER TABLE categories ADD COLUMN published_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE websites ADD COLUMN category_slugs TEXT NOT NULL DEFAULT '[]';

CREATE TABLE counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT INTO counters (name, value) VALUES ('published_websites', 0), ('ring_version', 0);

CREATE VIRTUAL TABLE websites_fts USING fts5(
  website_id UNINDEXED,
  name,
  description,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER websites_fts_insert AFTER INSERT ON websites BEGIN
  INSERT INTO websites_fts (website_id, name, description)
  VALUES (NEW.id, NEW.name, NEW.description);
END;

CREATE TRIGGER websites_fts_update AFTER UPDATE OF name, description ON websites BEGIN
  UPDATE websites_fts SET name = NEW.name, description = NEW.description
  WHERE website_id = NEW.id;
END;

CREATE TRIGGER websites_fts_delete AFTER DELETE ON websites BEGIN
  DELETE FROM websites_fts WHERE website_id = OLD.id;
END;

CREATE TRIGGER websites_published_insert AFTER INSERT ON websites
WHEN NEW.status = 'published' BEGIN
  UPDATE counters SET value = value + 1 WHERE name IN ('published_websites', 'ring_version');
END;

CREATE TRIGGER websites_published_change AFTER UPDATE OF status ON websites
WHEN (OLD.status = 'published') != (NEW.status = 'published') BEGIN
  UPDATE counters
    SET value = value + CASE WHEN NEW.status = 'published' THEN 1 ELSE -1 END
    WHERE name = 'published_websites';
  UPDATE categories
    SET published_count = published_count + CASE WHEN NEW.status = 'published' THEN 1 ELSE -1 END
    WHERE slug IN (SELECT category_slug FROM website_categories WHERE website_id = NEW.id);
  UPDATE counters SET value = value + 1 WHERE name = 'ring_version';
END;

-- Counts the categories here; the cascade removes them after the site is gone, when
-- website_categories_delete no longer finds a published site to decrement.
CREATE TRIGGER websites_before_delete BEFORE DELETE ON websites
WHEN OLD.status = 'published' BEGIN
  UPDATE categories SET published_count = published_count - 1
    WHERE slug IN (SELECT category_slug FROM website_categories WHERE website_id = OLD.id);
  UPDATE counters SET value = value - 1 WHERE name = 'published_websites';
  UPDATE counters SET value = value + 1 WHERE name = 'ring_version';
END;

CREATE TRIGGER websites_ring_order_change AFTER UPDATE OF verified_at, published_at ON websites
WHEN OLD.status = 'published' AND NEW.status = 'published'
  AND ((OLD.verified_at IS NULL) != (NEW.verified_at IS NULL)
    OR OLD.published_at IS NOT NEW.published_at) BEGIN
  UPDATE counters SET value = value + 1 WHERE name = 'ring_version';
END;

CREATE TRIGGER website_categories_insert AFTER INSERT ON website_categories BEGIN
  UPDATE categories SET published_count = published_count + 1
    WHERE slug = NEW.category_slug
      AND EXISTS (SELECT 1 FROM websites WHERE id = NEW.website_id AND status = 'published');
  UPDATE websites SET category_slugs = COALESCE((
      SELECT json_group_array(slug) FROM (
        SELECT c.slug FROM website_categories wc
        JOIN categories c ON c.slug = wc.category_slug
        WHERE wc.website_id = NEW.website_id ORDER BY c.position)), '[]')
    WHERE id = NEW.website_id;
END;

CREATE TRIGGER website_categories_delete AFTER DELETE ON website_categories BEGIN
  UPDATE categories SET published_count = published_count - 1
    WHERE slug = OLD.category_slug
      AND EXISTS (SELECT 1 FROM websites WHERE id = OLD.website_id AND status = 'published');
  UPDATE websites SET category_slugs = COALESCE((
      SELECT json_group_array(slug) FROM (
        SELECT c.slug FROM website_categories wc
        JOIN categories c ON c.slug = wc.category_slug
        WHERE wc.website_id = OLD.website_id ORDER BY c.position)), '[]')
    WHERE id = OLD.website_id;
END;

-- One-time backfill; the same statements as sql/rebuild-derived.sql.
UPDATE websites SET category_slugs = COALESCE((
  SELECT json_group_array(slug) FROM (
    SELECT c.slug FROM website_categories wc
    JOIN categories c ON c.slug = wc.category_slug
    WHERE wc.website_id = websites.id ORDER BY c.position)), '[]');

UPDATE categories SET published_count = (
  SELECT COUNT(*) FROM website_categories wc
  JOIN websites w ON w.id = wc.website_id
  WHERE wc.category_slug = categories.slug AND w.status = 'published');

UPDATE counters SET value = (SELECT COUNT(*) FROM websites WHERE status = 'published')
  WHERE name = 'published_websites';

DELETE FROM websites_fts;

INSERT INTO websites_fts (website_id, name, description)
  SELECT id, name, description FROM websites;

UPDATE counters SET value = value + 1 WHERE name = 'ring_version';
