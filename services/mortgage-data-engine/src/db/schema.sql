-- ============================================
-- Mortgage Data Engine — D1 Schema (P0)
-- ============================================

-- Infrastructure: Lender Registry
CREATE TABLE IF NOT EXISTS lenders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wholesale','retail','credit_union','online')),
  tpo_portal_url TEXT,
  retail_rates_url TEXT,
  nmls_id TEXT,
  is_active INTEGER DEFAULT 1,
  crawl_config TEXT DEFAULT '{}',  -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Infrastructure: Crawl Job Tracking
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  trigger_type TEXT NOT NULL DEFAULT 'scheduled',
  urls_targeted INTEGER DEFAULT 0,
  urls_completed INTEGER DEFAULT 0,
  urls_failed INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_log TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_category_status ON crawl_jobs(category, status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created ON crawl_jobs(created_at);

-- Category 1: Wholesale Rates
CREATE TABLE IF NOT EXISTS wholesale_rates (
  id TEXT PRIMARY KEY,
  lender_id TEXT NOT NULL REFERENCES lenders(id),
  product_type TEXT NOT NULL,
  rate REAL NOT NULL,
  apr REAL NOT NULL,
  points REAL DEFAULT 0,
  lock_period_days INTEGER NOT NULL,
  ltv_min REAL,
  ltv_max REAL,
  fico_min INTEGER,
  fico_max INTEGER,
  loan_amount_min INTEGER,
  loan_amount_max INTEGER,
  property_type TEXT,
  occupancy TEXT,
  state_restrictions TEXT DEFAULT '[]',  -- JSON array
  comp_to_broker_bps INTEGER,
  effective_date TEXT,
  expiration_date TEXT,
  crawl_job_id TEXT REFERENCES crawl_jobs(id),
  crawled_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wholesale_lookup
  ON wholesale_rates(product_type, occupancy, property_type, crawled_at);
CREATE INDEX IF NOT EXISTS idx_wholesale_fico
  ON wholesale_rates(fico_min, fico_max);
CREATE INDEX IF NOT EXISTS idx_wholesale_ltv
  ON wholesale_rates(ltv_min, ltv_max);
CREATE INDEX IF NOT EXISTS idx_wholesale_lender
  ON wholesale_rates(lender_id, crawled_at);

-- Category 2: Retail Competitor Rates
CREATE TABLE IF NOT EXISTS retail_rates (
  id TEXT PRIMARY KEY,
  lender_id TEXT NOT NULL REFERENCES lenders(id),
  lender_type TEXT NOT NULL,
  product_type TEXT NOT NULL,
  advertised_rate REAL NOT NULL,
  advertised_apr REAL,
  points REAL DEFAULT 0,
  estimated_fees REAL,
  assumptions_fico INTEGER,
  assumptions_ltv REAL,
  assumptions_loan_amount INTEGER,
  source_url TEXT,
  crawl_job_id TEXT REFERENCES crawl_jobs(id),
  crawled_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_retail_lookup
  ON retail_rates(product_type, crawled_at);
CREATE INDEX IF NOT EXISTS idx_retail_lender
  ON retail_rates(lender_id, crawled_at);

-- Category 3: Lead Enrichment — Property
CREATE TABLE IF NOT EXISTS property_enrichments (
  id TEXT PRIMARY KEY,
  property_address TEXT NOT NULL,
  address_normalized TEXT NOT NULL,
  estimated_value INTEGER,
  last_sale_price INTEGER,
  last_sale_date TEXT,
  tax_annual INTEGER,
  tax_assessed_value INTEGER,
  bedrooms INTEGER,
  bathrooms REAL,
  sqft INTEGER,
  lot_size_acres REAL,
  year_built INTEGER,
  property_type TEXT,
  listing_status TEXT,
  listing_price INTEGER,
  days_on_market INTEGER,
  hoa_monthly INTEGER,
  data_sources TEXT DEFAULT '[]',  -- JSON array
  crawl_job_id TEXT REFERENCES crawl_jobs(id),
  crawled_at TEXT DEFAULT (datetime('now')),
  cache_expires_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_address
  ON property_enrichments(address_normalized);
CREATE INDEX IF NOT EXISTS idx_property_cache
  ON property_enrichments(cache_expires_at);

-- Category 3: Lead Enrichment — Person
CREATE TABLE IF NOT EXISTS person_enrichments (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  job_title TEXT,
  employer TEXT,
  employment_tenure_years REAL,
  estimated_income_bracket TEXT,
  education_level TEXT,
  data_sources TEXT DEFAULT '[]',  -- JSON array
  crawl_job_id TEXT REFERENCES crawl_jobs(id),
  crawled_at TEXT DEFAULT (datetime('now')),
  cache_expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_person_lead
  ON person_enrichments(lead_id);

-- Credit Tracking
CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  crawl_job_id TEXT REFERENCES crawl_jobs(id),
  category TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_credit_date ON credit_ledger(created_at);

-- ============================================
-- Seed: Top 10 Wholesale Lenders (Conservative Start)
-- ============================================
INSERT OR IGNORE INTO lenders (id, name, type, tpo_portal_url, nmls_id, crawl_config) VALUES
  ('lender_uwm', 'United Wholesale Mortgage', 'wholesale', 'https://www.uwm.com', '3038', '{"requires_auth":true,"rate_sheet_url_pattern":"uwm.com/rate-sheets","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":1}'),
  ('lender_rocket', 'Rocket Pro TPO', 'wholesale', 'https://www.rocketprotpo.com', '3030', '{"requires_auth":true,"rate_sheet_url_pattern":"rocketprotpo.com/rates","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":1}'),
  ('lender_pennymac', 'PennyMac TPO', 'wholesale', 'https://www.pennymactpo.com', '35953', '{"requires_auth":true,"rate_sheet_url_pattern":"pennymactpo.com/rates","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":1}'),
  ('lender_amerihome', 'AmeriHome', 'wholesale', 'https://www.amerihome.com', '135265', '{"requires_auth":true,"rate_sheet_url_pattern":"amerihome.com/correspondent","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":2}'),
  ('lender_newrez', 'NewRez Wholesale', 'wholesale', 'https://www.newrezwholesale.com', '3013', '{"requires_auth":true,"rate_sheet_url_pattern":"newrezwholesale.com/rates","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":2}'),
  ('lender_freedom', 'Freedom Mortgage', 'wholesale', 'https://www.freedomwholesale.com', '2767', '{"requires_auth":true,"rate_sheet_url_pattern":"freedomwholesale.com/rates","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":2}'),
  ('lender_planet', 'Planet Home Lending', 'wholesale', 'https://www.planethomelending.com', '17022', '{"requires_auth":true,"rate_sheet_url_pattern":"planethomelending.com/rates","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":2}'),
  ('lender_crosscountry', 'CrossCountry Mortgage', 'wholesale', 'https://www.crosscountrywholesale.com', '3029', '{"requires_auth":true,"rate_sheet_url_pattern":"crosscountrywholesale.com/rates","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":2}'),
  ('lender_caliber', 'Caliber Home Loans', 'wholesale', 'https://www.caliberwholesale.com', '15622', '{"requires_auth":true,"rate_sheet_url_pattern":"caliberwholesale.com/rates","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":3}'),
  ('lender_plaza', 'Plaza Home Mortgage', 'wholesale', 'https://www.plazahomemortgage.com', '2113', '{"requires_auth":true,"rate_sheet_url_pattern":"plazahomemortgage.com/rates","extraction_prompt":"Extract all mortgage rate offerings","crawl_priority":3}');

-- Seed: Retail Competitors
INSERT OR IGNORE INTO lenders (id, name, type, retail_rates_url, crawl_config) VALUES
  ('lender_chase', 'Chase', 'retail', 'https://www.chase.com/personal/mortgage/mortgage-rates', '{"requires_auth":false,"rate_sheet_url_pattern":"chase.com/personal/mortgage/mortgage-rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":1}'),
  ('lender_wellsfargo', 'Wells Fargo', 'retail', 'https://www.wellsfargo.com/mortgage/rates/', '{"requires_auth":false,"rate_sheet_url_pattern":"wellsfargo.com/mortgage/rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":1}'),
  ('lender_bofa', 'Bank of America', 'retail', 'https://www.bankofamerica.com/mortgage/mortgage-rates/', '{"requires_auth":false,"rate_sheet_url_pattern":"bankofamerica.com/mortgage/mortgage-rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":1}'),
  ('lender_better', 'Better.com', 'online', 'https://better.com/rates', '{"requires_auth":false,"rate_sheet_url_pattern":"better.com/rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":1}'),
  ('lender_sofi', 'SoFi', 'online', 'https://www.sofi.com/home-loans/mortgage-rates/', '{"requires_auth":false,"rate_sheet_url_pattern":"sofi.com/home-loans/mortgage-rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":1}'),
  ('lender_loandepot', 'LoanDepot', 'online', 'https://www.loandepot.com/mortgage-rates', '{"requires_auth":false,"rate_sheet_url_pattern":"loandepot.com/mortgage-rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":2}'),
  ('lender_guaranteed', 'Guaranteed Rate', 'online', 'https://www.rate.com/mortgage-rates', '{"requires_auth":false,"rate_sheet_url_pattern":"rate.com/mortgage-rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":2}'),
  ('lender_navyfed', 'Navy Federal CU', 'credit_union', 'https://www.navyfederal.org/loans-cards/mortgage/mortgage-rates/', '{"requires_auth":false,"rate_sheet_url_pattern":"navyfederal.org/loans-cards/mortgage/mortgage-rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":2}'),
  ('lender_penfed', 'PenFed CU', 'credit_union', 'https://www.penfed.org/mortgage-center/mortgage-rates', '{"requires_auth":false,"rate_sheet_url_pattern":"penfed.org/mortgage-center/mortgage-rates","extraction_prompt":"Extract advertised mortgage rates","crawl_priority":2}'),
  ('lender_bankrate', 'Bankrate', 'retail', 'https://www.bankrate.com/mortgages/mortgage-rates/', '{"requires_auth":false,"rate_sheet_url_pattern":"bankrate.com/mortgages/mortgage-rates","extraction_prompt":"Extract averaged and advertised mortgage rates","crawl_priority":1}');
