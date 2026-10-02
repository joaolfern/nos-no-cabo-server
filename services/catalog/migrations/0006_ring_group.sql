-- A real column, so neighbour lookups can seek the ring index by position (row values
-- can't range over the expression verified_at IS NULL).
ALTER TABLE websites ADD COLUMN ring_group INTEGER GENERATED ALWAYS AS (verified_at IS NULL) VIRTUAL;

DROP INDEX websites_by_ring;

CREATE INDEX websites_by_ring ON websites (status, ring_group, published_at, id);
