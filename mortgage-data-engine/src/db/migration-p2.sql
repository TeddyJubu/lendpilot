-- ============================================
-- P2 Migration: Web-Agent Integration
-- Run: wrangler d1 execute MORTGAGE_DB --file=./src/db/migration-p2.sql
-- ============================================

-- Agent Task Tracking (mirrors crawl_jobs but for async Node.js tasks)
CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL CHECK (task_type IN ('lender_discovery', 'regulatory_scan')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  triggered_by TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (triggered_by IN ('scheduled', 'manual')),
  result_summary TEXT,              -- JSON summary from agent
  records_created INTEGER DEFAULT 0,
  errors TEXT DEFAULT '[]',         -- JSON array of error strings
  agent_service_url TEXT,           -- which web-agent deployment handled it
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_type_status
  ON agent_tasks(task_type, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created
  ON agent_tasks(created_at);

-- Discovered Lenders (pending broker review before promotion to lenders table)
CREATE TABLE IF NOT EXISTS discovered_lenders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'wholesale'
    CHECK (type IN ('wholesale', 'retail', 'credit_union', 'online')),
  tpo_portal_url TEXT,
  nmls_id TEXT,
  requires_auth INTEGER DEFAULT 0,
  confidence_score REAL NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  discovery_notes TEXT,
  discovery_source TEXT DEFAULT 'web-agent-lender-discovery',
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_at TEXT,
  agent_task_id TEXT REFERENCES agent_tasks(id),
  discovered_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discovered_lenders_review
  ON discovered_lenders(review_status, confidence_score);
CREATE INDEX IF NOT EXISTS idx_discovered_lenders_discovered
  ON discovered_lenders(discovered_at);

-- Agent Regulatory Findings
-- Separate from regulatory_updates: agent finds deeper/supplemental items the
-- structured crawler missed. High-relevance items are promoted to regulatory_updates.
CREATE TABLE IF NOT EXISTS agent_regulatory_findings (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  published_date TEXT NOT NULL,
  effective_date TEXT,
  affects_loan_types TEXT DEFAULT '[]',   -- JSON array
  affects_states TEXT DEFAULT '[]',       -- JSON array
  url TEXT,
  relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 1 AND 10),
  broker_impact TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'promoted', 'dismissed')),
  promoted_at TEXT,                       -- when promoted to regulatory_updates
  agent_task_id TEXT REFERENCES agent_tasks(id),
  discovered_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_reg_findings_review
  ON agent_regulatory_findings(review_status, relevance_score);
CREATE INDEX IF NOT EXISTS idx_agent_reg_findings_source
  ON agent_regulatory_findings(source, published_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_reg_findings_dedup
  ON agent_regulatory_findings(source, title, published_date);
