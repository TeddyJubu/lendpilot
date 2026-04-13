/**
 * @organ feed
 * @tissue helpers
 * @description Rule-based feed item generation logic.
 *   4 rules generate feed items from loan/contact/doc state.
 * @depends-on types.ts
 * @depended-by feed/mutations.ts (generation trigger)
 */

import type { FeedItemType, FeedPriority } from "../types";

interface FeedItemSeed {
  type: FeedItemType;
  priority: FeedPriority;
  title: string;
  description: string;
  suggestedAction: string;
  suggestedActionType: string;
  loanId?: string;
  contactId?: string;
}

/**
 * Rule 1: Document overdue 3+ days → doc_follow_up (high)
 */
export function checkOverdueDoc(doc: {
  name: string;
  dueDate: number;
  loanId: string;
  contactId: string;
}): FeedItemSeed | null {
  const daysOverdue = Math.floor(
    (Date.now() - doc.dueDate) / (1000 * 60 * 60 * 24)
  );
  if (daysOverdue < 3) return null;

  return {
    type: "doc_follow_up",
    priority: "high",
    title: `Document overdue: ${doc.name}`,
    description: `${doc.name} is ${daysOverdue} days past due. Follow up with borrower.`,
    suggestedAction: "Send reminder",
    suggestedActionType: "email",
    loanId: doc.loanId,
    contactId: doc.contactId,
  };
}

/**
 * Rule 2: Loan in stage 7+ days → pipeline_update (medium)
 */
export function checkStaleLoan(loan: {
  stage: string;
  stageEnteredAt: number;
  loanId: string;
  contactId: string;
  borrowerName: string;
}): FeedItemSeed | null {
  const daysInStage = Math.floor(
    (Date.now() - loan.stageEnteredAt) / (1000 * 60 * 60 * 24)
  );
  if (daysInStage < 7) return null;

  return {
    type: "pipeline_update",
    priority: "medium",
    title: `Loan stalled: ${loan.borrowerName}`,
    description: `Loan has been in "${loan.stage}" for ${daysInStage} days. Review and take action.`,
    suggestedAction: "Review loan",
    suggestedActionType: "navigate",
    loanId: loan.loanId,
    contactId: loan.contactId,
  };
}

/**
 * Rule 3: Contact untouched 14+ days → relationship_touch (low)
 */
export function checkStaleContact(contact: {
  firstName: string;
  lastName: string;
  lastContactedAt: number | undefined;
  contactId: string;
}): FeedItemSeed | null {
  if (!contact.lastContactedAt) {
    // Never contacted — suggest reaching out
    return {
      type: "relationship_touch",
      priority: "low",
      title: `Reach out to ${contact.firstName} ${contact.lastName}`,
      description: "This contact has never been contacted. Send an introduction.",
      suggestedAction: "Send email",
      suggestedActionType: "email",
      contactId: contact.contactId,
    };
  }

  const daysSinceContact = Math.floor(
    (Date.now() - contact.lastContactedAt) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceContact < 14) return null;

  return {
    type: "relationship_touch",
    priority: "low",
    title: `Follow up with ${contact.firstName} ${contact.lastName}`,
    description: `Last contacted ${daysSinceContact} days ago. Maintain the relationship.`,
    suggestedAction: "Send check-in",
    suggestedActionType: "email",
    contactId: contact.contactId,
  };
}

/**
 * Rule 4: Rate lock expires in 3 days → condition_due (urgent)
 */
export function checkLockExpiring(loan: {
  lockExpiration: number | undefined;
  lockedLender: string | undefined;
  loanId: string;
  contactId: string;
  borrowerName: string;
}): FeedItemSeed | null {
  if (!loan.lockExpiration) return null;

  const daysUntilExpiry = Math.floor(
    (loan.lockExpiration - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilExpiry > 3 || daysUntilExpiry < 0) return null;

  return {
    type: "condition_due",
    priority: "urgent",
    title: `Rate lock expiring: ${loan.borrowerName}`,
    description: `Lock with ${loan.lockedLender ?? "lender"} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}. Take action.`,
    suggestedAction: "Review lock",
    suggestedActionType: "navigate",
    loanId: loan.loanId,
    contactId: loan.contactId,
  };
}
