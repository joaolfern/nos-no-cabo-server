DELETE FROM websites WHERE submitter_ip_hash = 'seed' AND url_normalized NOT IN ('fit-tecnologia.org.br/pnaat', 'qedu.org.br', 'novaescola.org.br', 'cataki.org', 'prosas.com.br', 'vlibras.gov.br', 'guiaderodas.com', 'tainacan.org', 'wikifavelas.com.br', 'queridodiario.org.br', 'serenata.ai', 'dadosabertos.saude.gov.br', 'impulsogov.org', 'mapbiomas.org', 'wikiaves.com.br', 'fogocruzado.org.br', 'brasilparticipativo.presidencia.gov.br', 'atados.com.br', 'transformabrasil.com.br');
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01M2Y1SM00MZ2HKGHJ1SX009GA', 'https://fit-tecnologia.org.br/pnaat', 'fit-tecnologia.org.br/pnaat', 'PNAAT', 'Residência tecnológica em IA e IoT para sistemas embarcados, com cursos online gratuitos e certificados, laboratórios maker e bolsas de residência em empresas, em uma competição entre 15 regiões do Brasil.', NULL, 'https://fit-tecnologia.org.br/pnaat/favicon.ico', NULL, 'published', 1789862400000, 1789862400000, NULL, 'seed', 'nreyTM')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'fit-tecnologia.org.br/pnaat' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'educacao' FROM websites WHERE url_normalized = 'fit-tecnologia.org.br/pnaat' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'ia-e-iot' FROM websites WHERE url_normalized = 'fit-tecnologia.org.br/pnaat' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JNYNKV00S10ECGXS9AVQ0X12', 'https://qedu.org.br', 'qedu.org.br', 'QEdu', 'Reúne dados públicos da educação básica, como Saeb e Ideb, em painéis claros sobre escolas, municípios e estados.', NULL, 'https://qedu.org.br/favicon.ico', NULL, 'published', 1741564800000, 1741564800000, NULL, 'seed', 'oEGCAc')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'qedu.org.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'educacao' FROM websites WHERE url_normalized = 'qedu.org.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01J59NB2002AC13GT07DP44612', 'https://novaescola.org.br', 'novaescola.org.br', 'Nova Escola', 'Plataforma gratuita com planos de aula, cursos e conteúdos alinhados à BNCC para professores da educação básica.', NULL, 'https://novaescola.org.br/apple-icon-57x57.png', NULL, 'published', 1723680000000, 1723680000000, NULL, 'seed', 'lHYFXl')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'novaescola.org.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'educacao' FROM websites WHERE url_normalized = 'novaescola.org.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JJ0G4M009JBVJ7MJ9V9FC8KM', 'https://www.cataki.org', 'cataki.org', 'Cataki', 'Aplicativo que conecta catadores de materiais recicláveis a quem precisa de coleta, aumentando a renda e a visibilidade desse trabalho.', NULL, 'https://www.cataki.org/favicon.ico', NULL, 'published', 1737331200000, 1737331200000, NULL, 'seed', 'TnaJMJ')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'cataki.org' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'trabalho' FROM websites WHERE url_normalized = 'cataki.org' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'meio-ambiente' FROM websites WHERE url_normalized = 'cataki.org' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JBWSY000MGGEBZXBYBX0T2YH', 'https://prosas.com.br', 'prosas.com.br', 'Prosas', 'Plataforma de seleção e monitoramento de projetos sociais que conecta patrocinadores, editais e organizações da sociedade civil.', NULL, 'https://prosas.com.br/favicon.ico', NULL, 'published', 1730764800000, 1730764800000, NULL, 'seed', 'bsb7jw')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'prosas.com.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'trabalho' FROM websites WHERE url_normalized = 'prosas.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'comunidades' FROM websites WHERE url_normalized = 'prosas.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JWMCKG00PVA64V0JQXXGJG03', 'https://vlibras.gov.br', 'vlibras.gov.br', 'VLibras', 'Conjunto gratuito e de código aberto de ferramentas que traduz conteúdos digitais em português para a Língua Brasileira de Sinais (Libras).', '#00a300', 'https://www.gov.br/governodigital/++theme++padrao_govbr/favicons/apple-touch-icon.png', NULL, 'published', 1748736000000, 1748736000000, NULL, 'seed', 'f7NDLY')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'vlibras.gov.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'inclusao' FROM websites WHERE url_normalized = 'vlibras.gov.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01J9Z0CR00QSZA2E9J4YAFZN1W', 'https://guiaderodas.com', 'guiaderodas.com', 'Guiaderodas', 'Aplicativo colaborativo para avaliar e mapear a acessibilidade de lugares para pessoas com deficiência ou mobilidade reduzida.', NULL, 'https://guiaderodas.com/wp-content/uploads/2026/08/cropped-Favicon-32x32.png', NULL, 'published', 1728691200000, 1728691200000, NULL, 'seed', 'OthZGF')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'guiaderodas.com' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'inclusao' FROM websites WHERE url_normalized = 'guiaderodas.com' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'cidades' FROM websites WHERE url_normalized = 'guiaderodas.com' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01HWRQ6W0012P6GZSKK4VKA84Z', 'https://tainacan.org', 'tainacan.org', 'Tainacan', 'Plataforma de código aberto para repositórios digitais em WordPress, usada por museus, arquivos e bibliotecas para publicar acervos.', '#1a57a5', 'https://tainacan.org/wp-content/uploads/2018/05/cropped-cropped-logo-300x300-2-32x32.png', 'https://github.com/tainacan/tainacan', 'published', 1714521600000, 1714521600000, NULL, 'seed', 'r8nIEo')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'tainacan.org' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'arte-e-cultura' FROM websites WHERE url_normalized = 'tainacan.org' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JM0W2K00N00WQHG1X694DAFN', 'https://wikifavelas.com.br', 'wikifavelas.com.br', 'Dicionário de Favelas Marielle Franco', 'Wiki de acesso aberto que reúne histórias, memórias e conhecimentos produzidos nas favelas e periferias.', NULL, 'https://wikifavelas.com.br/themes/images/favicon.ico', NULL, 'published', 1739491200000, 1739491200000, NULL, 'seed', '7YLkSz')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'wikifavelas.com.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'arte-e-cultura' FROM websites WHERE url_normalized = 'wikifavelas.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'comunidades' FROM websites WHERE url_normalized = 'wikifavelas.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01K4195M00T2TTSNC6KNADSNJ6', 'https://queridodiario.org.br', 'queridodiario.org.br', 'Querido Diário', 'Extrai e organiza os diários oficiais dos municípios com tecnologia aberta, facilitando o acompanhamento dos atos das prefeituras.', '#6c4b97', 'https://queridodiario.org.br/favicon.ico', 'https://github.com/okfn-brasil/querido-diario', 'published', 1756684800000, 1756684800000, NULL, 'seed', 'qquEut')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'queridodiario.org.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'ia-e-iot' FROM websites WHERE url_normalized = 'queridodiario.org.br' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'cidades' FROM websites WHERE url_normalized = 'queridodiario.org.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01J1NSEQ00M9ZV2B9EHF9GJA0N', 'https://serenata.ai', 'serenata.ai', 'Operação Serenata de Amor', 'Projeto aberto que usa inteligência artificial para analisar gastos de parlamentares e apontar possíveis irregularidades.', NULL, NULL, 'https://github.com/okfn-brasil/serenata-de-amor', 'published', 1719792000000, 1719792000000, NULL, 'seed', 'MrlTJU')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'serenata.ai' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'ia-e-iot' FROM websites WHERE url_normalized = 'serenata.ai' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'cidades' FROM websites WHERE url_normalized = 'serenata.ai' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JSDCPR00N3WENGAK4GAFGK57', 'https://dadosabertos.saude.gov.br', 'dadosabertos.saude.gov.br', 'OpenDataSUS', 'Portal de dados abertos do SUS, com indicadores e bases públicas de saúde para pesquisa e controle social.', NULL, 'https://dadosabertos.saude.gov.br/favicons/apple-touch-icon.png', NULL, 'published', 1745280000000, 1745280000000, NULL, 'seed', 'xFtwST')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'dadosabertos.saude.gov.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'saude' FROM websites WHERE url_normalized = 'dadosabertos.saude.gov.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JZKNA300SY9DMDAE1ZQS4J9S', 'https://impulsogov.org', 'impulsogov.org', 'ImpulsoGov', 'Organização sem fins lucrativos que cria ferramentas de dados para apoiar equipes do SUS na atenção primária à saúde.', NULL, 'https://images.squarespace-cdn.com/content/v1/67fd2069e17029186d16a300/daa3681e-c1f6-4eff-8efa-3d73963a8f78/favicon.ico?format=100w', NULL, 'published', 1751932800000, 1751932800000, NULL, 'seed', '48Q8Ln')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'impulsogov.org' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'saude' FROM websites WHERE url_normalized = 'impulsogov.org' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JTEVW300N30G2GR90S20K2BT', 'https://mapbiomas.org', 'mapbiomas.org', 'MapBiomas', 'Rede colaborativa que produz mapas abertos de uso da terra, desmatamento, fogo e água em todos os biomas brasileiros.', NULL, 'https://mapbiomas.org/wp-content/themes/mapbiomas/assets/img/favicons/favicon.ico', NULL, 'published', 1746403200000, 1746403200000, NULL, 'seed', 'E0k5eK')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'mapbiomas.org' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'meio-ambiente' FROM websites WHERE url_normalized = 'mapbiomas.org' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01J816VG00EJM77JY2076KQFB0', 'https://www.wikiaves.com.br', 'wikiaves.com.br', 'WikiAves', 'Comunidade de ciência cidadã em que observadores compartilham fotos e sons das aves do Brasil.', NULL, 'https://www.wikiaves.com.br/img/logo/favicon.ico', NULL, 'published', 1726617600000, 1726617600000, NULL, 'seed', '5mED6w')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'wikiaves.com.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'meio-ambiente' FROM websites WHERE url_normalized = 'wikiaves.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'comunidades' FROM websites WHERE url_normalized = 'wikiaves.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01K1PKMS000DNNRRCXZVBXEDJ2', 'https://fogocruzado.org.br', 'fogocruzado.org.br', 'Fogo Cruzado', 'Laboratório de dados que registra tiroteios e violência armada em regiões metropolitanas e publica os dados de forma aberta.', NULL, 'https://fogocruzado.org.br/favicon.ico', NULL, 'published', 1754179200000, 1754179200000, NULL, 'seed', 'RRcS4Q')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'fogocruzado.org.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'cidades' FROM websites WHERE url_normalized = 'fogocruzado.org.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JQD0RS00TEHTS5TA84ZMQNGV', 'https://brasilparticipativo.presidencia.gov.br', 'brasilparticipativo.presidencia.gov.br', 'Brasil Participativo', 'Plataforma oficial de participação social do Governo Federal para consultas públicas, conferências e propostas colaborativas.', '#1351b4', NULL, NULL, 'published', 1743120000000, 1743120000000, NULL, 'seed', 'P2AebR')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'brasilparticipativo.presidencia.gov.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'cidades' FROM websites WHERE url_normalized = 'brasilparticipativo.presidencia.gov.br' AND submitter_ip_hash = 'seed';
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'comunidades' FROM websites WHERE url_normalized = 'brasilparticipativo.presidencia.gov.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01HZZQ3M00E7X65G4NJNMCNBM6', 'https://atados.com.br', 'atados.com.br', 'Atados', 'Plataforma de voluntariado que conecta pessoas a organizações sociais e causas em todo o Brasil.', '#dc3545', 'https://www.atados.com.br/static/logo/logo-light.svg', NULL, 'published', 1717977600000, 1717977600000, NULL, 'seed', 'Qsz7qb')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'atados.com.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'comunidades' FROM websites WHERE url_normalized = 'atados.com.br' AND submitter_ip_hash = 'seed';
INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES ('01JE2AND00TM1JT2N4XD9K02B0', 'https://transformabrasil.com.br', 'transformabrasil.com.br', 'Transforma Brasil', 'Plataforma nacional de voluntariado que conecta voluntários a organizações e projetos sociais.', NULL, NULL, NULL, 'published', 1733097600000, 1733097600000, NULL, 'seed', '6cNqkG')
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.submitter_ip_hash = 'seed';
DELETE FROM website_categories WHERE website_id IN (SELECT id FROM websites WHERE url_normalized = 'transformabrasil.com.br' AND submitter_ip_hash = 'seed');
INSERT INTO website_categories (website_id, category_slug) SELECT id, 'comunidades' FROM websites WHERE url_normalized = 'transformabrasil.com.br' AND submitter_ip_hash = 'seed';
