DELETE FROM websites WHERE submitter_ip_hash = 'seed' AND url_normalized NOT IN ('fit-tecnologia.org.br/pnaat', 'cataki.org', 'mapbiomas.org', 'wikiaves.com.br', 'transformabrasil.com.br');
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01M2Y1SM00PTEF58388N6W5ZDH', 'https://fit-tecnologia.org.br/pnaat', 'fit-tecnologia.org.br/pnaat', 'PNAAT', 'Residência tecnológica em IA e IoT para sistemas embarcados, com cursos online gratuitos e certificados, laboratórios maker e bolsas de residência em empresas, em uma competição entre 15 regiões do Brasil.', NULL, 'https://fit-tecnologia.org.br/pnaat/favicon.ico', NULL, 'published', 1789862400000, 1789862400000, NULL, 'seed', 'sXfuyx')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'fit-tecnologia.org.br/pnaat' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'educacao' FROM websites WHERE url_normalized = 'fit-tecnologia.org.br/pnaat' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'ia-e-iot' FROM websites WHERE url_normalized = 'fit-tecnologia.org.br/pnaat' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JJ0G4M003HJD0P8TNWD6W7MB', 'https://www.cataki.org', 'cataki.org', 'Cataki', 'Aplicativo que conecta catadores de materiais recicláveis a quem precisa de coleta, aumentando a renda e a visibilidade desse trabalho.', NULL, 'https://www.cataki.org/favicon.ico', NULL, 'published', 1737331200000, 1737331200000, NULL, 'seed', 'a0MS1c')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'cataki.org' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'trabalho' FROM websites WHERE url_normalized = 'cataki.org' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'meio-ambiente' FROM websites WHERE url_normalized = 'cataki.org' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JTEVW3005NVZDY9CAQSCKCEB', 'https://mapbiomas.org', 'mapbiomas.org', 'MapBiomas', 'Rede colaborativa que produz mapas abertos de uso da terra, desmatamento, fogo e água em todos os biomas brasileiros.', NULL, 'https://mapbiomas.org/wp-content/themes/mapbiomas/assets/img/favicons/favicon.ico', NULL, 'published', 1746403200000, 1746403200000, NULL, 'seed', '641HW2')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'mapbiomas.org' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'meio-ambiente' FROM websites WHERE url_normalized = 'mapbiomas.org' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01J816VG00DTEA3S9F9E12GGRM', 'https://www.wikiaves.com.br', 'wikiaves.com.br', 'WikiAves', 'Comunidade de ciência cidadã em que observadores compartilham fotos e sons das aves do Brasil.', NULL, 'https://www.wikiaves.com.br/img/logo/favicon.ico', NULL, 'published', 1726617600000, 1726617600000, NULL, 'seed', 'T6wkb5')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'wikiaves.com.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'meio-ambiente' FROM websites WHERE url_normalized = 'wikiaves.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'comunidades' FROM websites WHERE url_normalized = 'wikiaves.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JE2AND000ZH7WB61X9YRV27H', 'https://transformabrasil.com.br', 'transformabrasil.com.br', 'Transforma Brasil', 'Plataforma nacional de voluntariado que conecta voluntários a organizações e projetos sociais.', NULL, NULL, NULL, 'published', 1733097600000, 1733097600000, NULL, 'seed', 'EddfaO')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'transformabrasil.com.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'comunidades' FROM websites WHERE url_normalized = 'transformabrasil.com.br' AND submitter_ip_hash = 'seed';
