-- ============================================
-- P1 Migration: DPA Programs + Regulatory Updates
-- Run: wrangler d1 execute mortgage-data-engine --file=./src/db/migration-p1.sql
-- ============================================

-- Category 4: DPA Programs
CREATE TABLE IF NOT EXISTS dpa_programs (
  id TEXT PRIMARY KEY,
  program_name TEXT NOT NULL,
  state TEXT NOT NULL,
  administering_agency TEXT,
  assistance_type TEXT NOT NULL,
  assistance_amount_max INTEGER,
  assistance_percentage_max REAL,
  income_limit INTEGER,
  income_limit_type TEXT DEFAULT 'household',
  first_time_buyer_required INTEGER DEFAULT 0,
  property_types_eligible TEXT DEFAULT '[]',
  counties_eligible TEXT DEFAULT '[]',
  fico_minimum INTEGER,
  max_purchase_price INTEGER,
  loan_types_compatible TEXT DEFAULT '[]',
  application_url TEXT,
  program_status TEXT DEFAULT 'active',
  last_verified TEXT,
  source_url TEXT,
  crawl_job_id TEXT REFERENCES crawl_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_dpa_state ON dpa_programs(state, program_status);
CREATE INDEX IF NOT EXISTS idx_dpa_active ON dpa_programs(program_status);

-- Category 5: Regulatory Updates
CREATE TABLE IF NOT EXISTS regulatory_updates (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,
  effective_date TEXT,
  published_date TEXT NOT NULL,
  affects_loan_types TEXT DEFAULT '[]',
  affects_states TEXT DEFAULT '[]',
  url TEXT,
  relevance_score INTEGER DEFAULT 5,
  broker_impact TEXT,
  crawl_job_id TEXT REFERENCES crawl_jobs(id),
  crawled_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_source ON regulatory_updates(source, published_date);
CREATE INDEX IF NOT EXISTS idx_reg_date ON regulatory_updates(published_date);
CREATE INDEX IF NOT EXISTS idx_reg_relevance ON regulatory_updates(relevance_score);
