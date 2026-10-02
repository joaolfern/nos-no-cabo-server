-- Recomputes every derived value from websites and website_categories (ADR 0005).
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
