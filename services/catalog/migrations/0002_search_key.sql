-- Accent- and case-insensitive search text (name + description), written by the catalog on insert.
ALTER TABLE websites ADD COLUMN search_key TEXT NOT NULL DEFAULT '';

UPDATE websites SET search_key = lower(name || ' ' || description);

-- Ring order: verified first, then by publication date (ADR 0004).
CREATE INDEX websites_by_ring ON websites (status, verified_at IS NULL, published_at, id);
