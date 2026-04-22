// ============================================
// Environment Bindings
// ============================================
export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  BROWSER: Fetcher; // Cloudflare Browser Rendering
  AI: Ai;
  CACHE: KVNamespace;
  ENVIRONMENT: string;
  CREDIT_BUDGET_MONTHLY: string;
  ALERT_WEBHOOK_URL: string;
  ADMIN_API_KEY: string;
  BROKER_WEBHOOK_SECRET: string;
  // Web-agent service (Node.js, deployed separately)
  FIRECRAWL_AGENT_URL: string;
  FIRECRAWL_AGENT_API_KEY: string;
}

// ============================================
// Product & Property Enums
// ============================================
export type ProductType =
  | "30yr_fixed" | "15yr_fixed" | "20yr_fixed"
  | "ARM_5_1" | "ARM_7_1" | "ARM_10_1"
  | "FHA_30yr" | "FHA_15yr"
  | "VA_30yr" | "VA_15yr"
  | "USDA_30yr"
  | "Jumbo_30yr" | "Jumbo_15yr"
  | "DSCR" | "Bank_Statement" | "Non_QM";

export type PropertyType = "SFR" | "Condo" | "Townhouse" | "Multi_2_4" | "Manufactured";
export type OccupancyType = "Primary" | "Second_Home" | "Investment";
export type IncomeBracket = "under_50k" | "50k_100k" | "100k_150k" | "150k_250k" | "over_250k";

export type CrawlCategory =
  | "wholesale_rates" | "retail_rates" | "lead_enrichment"
  | "dpa_programs" | "regulatory" | "realtor_profiles"
  | "agent_lender_discovery" | "agent_regulatory_scan";

export type CrawlStatus = "queued" | "running" | "completed" | "failed" | "partial";
export type CrawlTrigger = "scheduled" | "on_demand" | "manual";

// ============================================
// Web-Agent Integration Types
// ============================================

export type AgentTaskType = "lender_discovery" | "regulatory_scan";
export type AgentTaskStatus = "queued" | "running" | "completed" | "failed";

export interface DiscoveredLender {
  name: string;
  type: "wholesale" | "retail" | "credit_union" | "online";
  tpo_portal_url?: string;
  nmls_id?: string;
  requires_auth: boolean;
  confidence_score: number;
  discovery_notes?: string;
}

export interface AgentRegulatoryFinding {
  title: string;
  source: string;
  document_type: string;
  summary: string;
  published_date: string;
  effective_date?: string;
  affects_loan_types: string[];
  affects_states: string[];
  url?: string;
  relevance_score: number;
  broker_impact: string;
}

export interface AgentIngestLendersBody {
  lenders: DiscoveredLender[];
  task_id: string;
  sources_checked: string[];
}

export interface AgentIngestRegulatoryBody {
  findings: AgentRegulatoryFinding[];
  task_id: string;
  sources_checked: string[];
  total_sources_scanned: number;
}

// ============================================
// Category 1: Wholesale Rates
// ============================================
export interface WholesaleRate {
  id: string;
  lender_id: string;
  product_type: ProductType;
  rate: number;
  apr: number;
  points: number;
  lock_period_days: 15 | 30 | 45 | 60;
  ltv_min: number;
  ltv_max: number;
  fico_min: number;
  fico_max: number;
  loan_amount_min: number;
  loan_amount_max: number;
  property_type: PropertyType;
  occupancy: OccupancyType;
  state_restrictions: string[];
  comp_to_broker_bps: number;
  effective_date: string;
  expiration_date: string;
  crawl_job_id: string;
  crawled_at: string;
}

// ============================================
// Category 2: Retail Competitor Rates
// ============================================
export interface RetailRate {
  id: string;
  lender_id: string;
  lender_type: "bank" | "online_lender" | "credit_union" | "aggregator";
  product_type: ProductType;
  advertised_rate: number;
  advertised_apr: number;
  points: number;
  estimated_fees: number | null;
  assumptions_fico: number;
  assumptions_ltv: number;
  assumptions_loan_amount: number;
  source_url: string;
  crawl_job_id: string;
  crawled_at: string;
}

// ============================================
// Category 3: Lead Enrichment
// ============================================
export interface PropertyEnrichment {
  id: string;
  property_address: string;
  address_normalized: string;
  estimated_value: number | null;
  last_sale_price: number | null;
  last_sale_date: string | null;
  tax_annual: number | null;
  tax_assessed_value: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  lot_size_acres: number | null;
  year_built: number | null;
  property_type: PropertyType;
  listing_status: "Active" | "Pending" | "Sold" | "Off_Market";
  listing_price: number | null;
  days_on_market: number | null;
  hoa_monthly: number | null;
  data_sources: string[];
  crawl_job_id: string;
  crawled_at: string;
  cache_expires_at: string;
}

export interface PersonEnrichment {
  id: string;
  lead_id: string;
  full_name: string;
  job_title: string | null;
  employer: string | null;
  employment_tenure_years: number | null;
  estimated_income_bracket: IncomeBracket | null;
  education_level: string | null;
  data_sources: string[];
  crawl_job_id: string;
  crawled_at: string;
  cache_expires_at: string;
}

// ============================================
// Infrastructure: Crawl Jobs
// ============================================
export interface CrawlJob {
  id: string;
  category: CrawlCategory;
  status: CrawlStatus;
  trigger: CrawlTrigger;
  urls_targeted: number;
  urls_completed: number;
  urls_failed: number;
  credits_used: number;
  records_created: number;
  records_updated: number;
  error_log: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ============================================
// Lender Registry
// ============================================
export interface Lender {
  id: string;
  name: string;
  type: "wholesale" | "retail" | "credit_union" | "online";
  tpo_portal_url: string | null;
  retail_rates_url: string | null;
  nmls_id: string | null;
  is_active: boolean;
  crawl_config: {
    requires_auth: boolean;
    rate_sheet_url_pattern: string;
    extraction_prompt: string;
    crawl_priority: 1 | 2 | 3;
  };
  created_at: string;
  updated_at: string;
}

// ============================================
// Extraction Results (from Workers AI)
// ============================================
export interface ExtractionResult<T> {
  success: boolean;
  data: T | null;
  raw_html_length: number;
  extraction_model: string;
  tokens_used: number;
  error?: string;
}

// ============================================
// API Types
// ============================================
export interface RateQuery {
  product_type?: ProductType;
  fico?: number;
  ltv?: number;
  loan_amount?: number;
  property_type?: PropertyType;
  occupancy?: OccupancyType;
}

export interface EnrichmentRequest {
  lead_id: string;
  full_name: string;
  property_address?: string;
  linkedin_url?: string;
}
