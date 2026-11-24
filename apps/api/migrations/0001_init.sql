-- 0001_init.sql
-- Skema awal: users, leads, lead_events.
-- Jalankan lewat `wrangler d1 migrations apply`.

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL,
  UNIQUE (org_id, email)
);

CREATE TABLE IF NOT EXISTS leads (
  id               TEXT PRIMARY KEY,
  org_id           TEXT NOT NULL,
  company_name     TEXT NOT NULL,
  name_norm        TEXT NOT NULL DEFAULT '',
  industry         TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT '',
  address          TEXT NOT NULL DEFAULT '',
  phone            TEXT NOT NULL DEFAULT '',
  phone_e164       TEXT,
  whatsapp         TEXT NOT NULL DEFAULT '',
  whatsapp_e164    TEXT,
  email            TEXT NOT NULL DEFAULT '',
  instagram        TEXT NOT NULL DEFAULT '',
  website          TEXT NOT NULL DEFAULT '',
  website_status   TEXT NOT NULL DEFAULT 'none',
  social_media_only INTEGER NOT NULL DEFAULT 0,
  maps_url         TEXT NOT NULL DEFAULT '',
  rating           REAL,
  reviews_count    INTEGER,
  pic_name         TEXT NOT NULL DEFAULT '',
  pic_role         TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  deal_size        TEXT NOT NULL DEFAULT 'medium',
  priority         INTEGER NOT NULL DEFAULT 3,
  is_hot_lead      INTEGER NOT NULL DEFAULT 0,
  gap_score        INTEGER NOT NULL DEFAULT 0,
  digital_gaps     TEXT NOT NULL DEFAULT '[]',
  services         TEXT NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'staging',
  source_url       TEXT NOT NULL DEFAULT '',
  created_by       TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone
  ON leads (org_id, phone_e164)
  WHERE phone_e164 IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_org_created
  ON leads (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_status
  ON leads (org_id, status);

CREATE TABLE IF NOT EXISTS lead_events (
  id         TEXT PRIMARY KEY,
  lead_id    TEXT NOT NULL,
  actor      TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead
  ON lead_events (lead_id, created_at DESC);
