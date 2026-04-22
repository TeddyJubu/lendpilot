/**
 * Shared types used across Convex organs and the frontend.
 * Import Convex document types from _generated/dataModel when available.
 */

// Loan stage type (mirrors the validator in loans/tables.ts)
export type LoanStage =
  | "new_lead"
  | "scored"
  | "contacted"
  | "pre_qualified"
  | "application_filed"
  | "docs_collecting"
  | "submitted_to_lender"
  | "in_underwriting"
  | "conditions"
  | "clear_to_close"
  | "closing_scheduled"
  | "funded"
  | "withdrawn"
  | "denied";

// Stage groups for kanban columns
export type StageGroup = "intake" | "qualification" | "processing" | "closing" | "terminal";

export const STAGE_GROUPS: Record<StageGroup, LoanStage[]> = {
  intake: ["new_lead", "scored", "contacted"],
  qualification: ["pre_qualified", "application_filed", "docs_collecting"],
  processing: ["submitted_to_lender", "in_underwriting", "conditions", "clear_to_close"],
  closing: ["closing_scheduled", "funded"],
  terminal: ["withdrawn", "denied"],
};

export const STAGE_DISPLAY_NAMES: Record<LoanStage, string> = {
  new_lead: "New Lead",
  scored: "Scored",
  contacted: "Contacted",
  pre_qualified: "Pre-Qualified",
  application_filed: "Application Filed",
  docs_collecting: "Docs Collecting",
  submitted_to_lender: "Submitted to Lender",
  in_underwriting: "In Underwriting",
  conditions: "Conditions",
  clear_to_close: "Clear to Close",
  closing_scheduled: "Closing Scheduled",
  funded: "Funded",
  withdrawn: "Withdrawn",
  denied: "Denied",
};

// Contact types
export type ContactType = "lead" | "borrower" | "referral_partner" | "realtor" | "other";

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  lead: "Lead",
  borrower: "Borrower",
  referral_partner: "Referral Partner",
  realtor: "Realtor",
  other: "Other",
};

// Document categories
export type DocumentCategory =
  | "income"
  | "asset"
  | "identity"
  | "property"
  | "credit"
  | "closing"
  | "condition"
  | "other";

export type DocumentStatus =
  | "requested"
  | "uploaded"
  | "ai_reviewing"
  | "approved"
  | "rejected"
  | "expired";

// Feed item types
export type FeedItemType =
  | "hot_lead"
  | "condition_due"
  | "rate_opportunity"
  | "doc_follow_up"
  | "pipeline_update"
  | "relationship_touch"
  | "closing_prep"
  | "ai_insight";

export type FeedPriority = "urgent" | "high" | "medium" | "low";

export const PRIORITY_ORDER: Record<FeedPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// Activity types
export type ActivityType =
  | "email_sent"
  | "email_received"
  | "sms_sent"
  | "sms_received"
  | "call_made"
  | "call_received"
  | "note"
  | "stage_change"
  | "doc_uploaded"
  | "doc_requested"
  | "ai_action"
  | "system";
