-- WSN v2 — esquema inicial (Cloudflare D1 / SQLite)
-- Regras de negócio espelhadas em CHECK/UNIQUE: o banco não confia só na aplicação.
-- Colunas *_enc guardam AES-256-GCM ("v<versão>.<iv>.<cifra>"); *_hash guardam HMAC-SHA256.
-- D1 aplica chaves estrangeiras por padrão.

-- ---------- Catálogo ----------
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE brands (
  id        INTEGER PRIMARY KEY,
  slug      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  logo_path TEXT
);

CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  ref         TEXT NOT NULL UNIQUE CHECK (length(ref) = 4 AND ref GLOB '[0-9][0-9][0-9][0-9]'),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  unit        TEXT NOT NULL CHECK (unit IN ('unidade', 'caixa', 'pacote', 'par', 'fardo', 'galao')),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  brand_id    INTEGER REFERENCES brands (id),
  description TEXT,
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0), -- interno, nunca público
  image_path  TEXT,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX products_category ON products (category_id, active);

CREATE TABLE product_slugs (
  old_slug   TEXT PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE
);

-- ---------- Equipe ----------
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'vendedor')),
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT
);

CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  id_hash      TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at   TEXT NOT NULL,
  ip_hash      TEXT,
  user_agent   TEXT
);
CREATE INDEX sessions_user ON sessions (user_id);

-- ---------- Cotações ----------
CREATE TABLE counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE quotes (
  id                TEXT PRIMARY KEY,
  protocol          TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL CHECK (status IN ('recebida', 'em_analise', 'respondida', 'ganha', 'perdida', 'cancelada', 'expirada')),
  idempotency_key   TEXT NOT NULL UNIQUE,
  name_enc          TEXT,
  email_enc         TEXT,
  email_hash        TEXT,
  phone_enc         TEXT,
  company_enc       TEXT,
  cnpj_enc          TEXT,
  message_enc       TEXT,
  cep               TEXT,
  is_sp_capital     INTEGER NOT NULL DEFAULT 0 CHECK (is_sp_capital IN (0, 1)),
  consent_at        TEXT NOT NULL,
  ip_hash           TEXT,
  assigned_to       TEXT REFERENCES users (id) ON DELETE SET NULL,
  first_response_at TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  anonymized_at     TEXT
);
CREATE INDEX quotes_status_created ON quotes (status, created_at);
CREATE INDEX quotes_created ON quotes (created_at);
CREATE INDEX quotes_email_hash ON quotes (email_hash);

CREATE TABLE quote_items (
  id         INTEGER PRIMARY KEY,
  quote_id   TEXT NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products (id) ON DELETE SET NULL,
  ref        TEXT NOT NULL,
  name       TEXT NOT NULL,
  unit       TEXT NOT NULL,
  quantity   INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 9999),
  position   INTEGER NOT NULL
);
CREATE INDEX quote_items_quote ON quote_items (quote_id);
CREATE INDEX quote_items_ref ON quote_items (ref);

CREATE TABLE quote_events (
  id          INTEGER PRIMARY KEY,
  quote_id    TEXT NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  note        TEXT,
  actor_id    TEXT REFERENCES users (id) ON DELETE SET NULL, -- NULL = cliente ou sistema
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX quote_events_quote ON quote_events (quote_id, created_at);

-- ---------- Propostas ----------
CREATE TABLE proposals (
  id                TEXT PRIMARY KEY,
  quote_id          TEXT NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
  version           INTEGER NOT NULL,
  token_hash        TEXT NOT NULL UNIQUE,
  token_enc         TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('enviada', 'aprovada', 'substituida', 'expirada')),
  valid_until       TEXT NOT NULL,
  subtotal_cents    INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents    INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  shipping_cents    INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents       INTEGER NOT NULL CHECK (total_cents >= 0),
  payment_terms     TEXT,
  delivery_terms    TEXT,
  notes             TEXT,
  created_by        TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  first_viewed_at   TEXT,
  view_count        INTEGER NOT NULL DEFAULT 0,
  approved_at       TEXT,
  approved_name_enc TEXT,
  approved_ip_hash  TEXT,
  UNIQUE (quote_id, version)
);
CREATE INDEX proposals_status_valid ON proposals (status, valid_until);

CREATE TABLE proposal_items (
  id               INTEGER PRIMARY KEY,
  proposal_id      TEXT NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  ref              TEXT NOT NULL,
  name             TEXT NOT NULL,
  unit             TEXT NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 9999),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  position         INTEGER NOT NULL
);
CREATE INDEX proposal_items_proposal ON proposal_items (proposal_id);

-- ---------- Contato ----------
CREATE TABLE contact_messages (
  id            TEXT PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'nova' CHECK (status IN ('nova', 'respondida', 'arquivada')),
  name_enc      TEXT,
  email_enc     TEXT,
  email_hash    TEXT,
  phone_enc     TEXT,
  company_enc   TEXT,
  subject       TEXT,
  body_enc      TEXT,
  consent_at    TEXT NOT NULL,
  ip_hash       TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  anonymized_at TEXT
);
CREATE INDEX contact_created ON contact_messages (created_at);

-- ---------- Inteligência comercial ----------
-- Termos buscados sem resultado: demanda que a WSN ainda não atende. Sem dado pessoal.
CREATE TABLE search_misses (
  term       TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 1,
  first_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------- Infraestrutura ----------
CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);

CREATE TABLE outbox (
  id              INTEGER PRIMARY KEY,
  kind            TEXT NOT NULL,
  to_enc          TEXT NOT NULL,
  subject         TEXT NOT NULL,
  html_enc        TEXT NOT NULL,
  text_enc        TEXT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sent_at         TEXT,
  last_error      TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX outbox_pending ON outbox (sent_at, next_attempt_at);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY,
  actor_id   TEXT,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  detail     TEXT, -- JSON sem dado pessoal
  ip_hash    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX audit_created ON audit_log (created_at);

-- Auditoria é somente-inclusão: nem a própria aplicação altera ou apaga.
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
