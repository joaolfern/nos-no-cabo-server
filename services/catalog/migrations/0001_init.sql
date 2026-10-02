-- Catalog schema (docs/architecture/target/backend/11-data-model.puml). Timestamps are epoch ms.

CREATE TABLE websites (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  url_normalized TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT,
  favicon_url TEXT,
  repo TEXT,
  short_code TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('checking', 'published', 'rejected')),
  rejection_reason TEXT CHECK (rejection_reason IN ('unsafe', 'unreachable', 'error')),
  submitted_at INTEGER NOT NULL,
  published_at INTEGER,
  verified_at INTEGER,
  last_verification_check_at INTEGER,
  rank_score REAL NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  submitter_ip_hash TEXT NOT NULL
);

CREATE INDEX websites_by_rank ON websites (status, rank_score DESC, published_at DESC, id DESC);
CREATE INDEX websites_by_recent ON websites (status, published_at DESC, id DESC);
CREATE INDEX websites_by_likes ON websites (status, likes DESC, published_at DESC, id DESC);
CREATE INDEX websites_by_name ON websites (status, lower(name), id);

CREATE TABLE categories (
  slug TEXT PRIMARY KEY,
  position INTEGER NOT NULL
);

INSERT INTO categories (slug, position) VALUES
  ('ia-e-iot', 1),
  ('educacao', 2),
  ('saude', 3),
  ('meio-ambiente', 4),
  ('cidades', 5),
  ('comunidades', 6),
  ('inclusao', 7),
  ('trabalho', 8),
  ('arte-e-cultura', 9),
  ('alimentacao', 10),
  ('outros', 11);

CREATE TABLE website_categories (
  website_id TEXT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories (slug),
  PRIMARY KEY (website_id, category_slug)
);

CREATE INDEX website_categories_by_category ON website_categories (category_slug, website_id);

CREATE TABLE moderation_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  website_id TEXT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('safe', 'unsafe', 'error')),
  categories_flagged TEXT,
  model TEXT NOT NULL,
  checked_at INTEGER NOT NULL
);
