import { describe, test, expect } from "vitest";
import {
  checkOverdueDoc,
  checkStaleLoan,
  checkStaleContact,
  checkLockExpiring,
} from "../helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("feed / helpers tissue — rule-based feed generation", () => {
  // ─── Rule 1: Overdue Documents ───
  describe("checkOverdueDoc", () => {
    test("generates doc_follow_up for 3+ days overdue", () => {
      const result = checkOverdueDoc({
        name: "W-2 Form",
        dueDate: Date.now() - 5 * DAY_MS,
        loanId: "loan123",
        contactId: "contact456",
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe("doc_follow_up");
      expect(result!.priority).toBe("high");
      expect(result!.title).toContain("W-2 Form");
      expect(result!.description).toContain("5 days");
    });

    test("returns null for docs overdue less than 3 days", () => {
      const result = checkOverdueDoc({
        name: "W-2 Form",
        dueDate: Date.now() - 2 * DAY_MS,
        loanId: "loan123",
        contactId: "contact456",
      });
      expect(result).toBeNull();
    });

    test("returns null for docs not yet due", () => {
      const result = checkOverdueDoc({
        name: "W-2 Form",
        dueDate: Date.now() + 5 * DAY_MS,
        loanId: "loan123",
        contactId: "contact456",
      });
      expect(result).toBeNull();
    });
  });

  // ─── Rule 2: Stale Loans ───
  describe("checkStaleLoan", () => {
    test("generates pipeline_update for 7+ days in stage", () => {
      const result = checkStaleLoan({
        stage: "in_underwriting",
        stageEnteredAt: Date.now() - 10 * DAY_MS,
        loanId: "loan123",
        contactId: "contact456",
        borrowerName: "John Doe",
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe("pipeline_update");
      expect(result!.priority).toBe("medium");
      expect(result!.title).toContain("John Doe");
      expect(result!.description).toContain("10 days");
    });

    test("returns null for loans in stage less than 7 days", () => {
      const result = checkStaleLoan({
        stage: "new_lead",
        stageEnteredAt: Date.now() - 3 * DAY_MS,
        loanId: "loan123",
        contactId: "contact456",
        borrowerName: "Jane Smith",
      });
      expect(result).toBeNull();
    });
  });

  // ─── Rule 3: Stale Contacts ───
  describe("checkStaleContact", () => {
    test("generates relationship_touch for 14+ days without contact", () => {
      const result = checkStaleContact({
        firstName: "Alice",
        lastName: "Brown",
        lastContactedAt: Date.now() - 20 * DAY_MS,
        contactId: "contact789",
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe("relationship_touch");
      expect(result!.priority).toBe("low");
      expect(result!.title).toContain("Alice Brown");
    });

    test("generates relationship_touch for never-contacted", () => {
      const result = checkStaleContact({
        firstName: "Bob",
        lastName: "Wilson",
        lastContactedAt: undefined,
        contactId: "contact000",
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe("relationship_touch");
      expect(result!.description).toContain("never been contacted");
    });

    test("returns null for recently contacted", () => {
      const result = checkStaleContact({
        firstName: "Carol",
        lastName: "Davis",
        lastContactedAt: Date.now() - 5 * DAY_MS,
        contactId: "contact111",
      });
      expect(result).toBeNull();
    });
  });

  // ─── Rule 4: Lock Expiring ───
  describe("checkLockExpiring", () => {
    test("generates condition_due for lock expiring in 1-3 days", () => {
      const result = checkLockExpiring({
        lockExpiration: Date.now() + 2 * DAY_MS,
        lockedLender: "UWM",
        loanId: "loan123",
        contactId: "contact456",
        borrowerName: "David Lee",
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe("condition_due");
      expect(result!.priority).toBe("urgent");
      expect(result!.title).toContain("David Lee");
      expect(result!.description).toContain("UWM");
    });

    test("returns null for lock expiring in more than 3 days", () => {
      const result = checkLockExpiring({
        lockExpiration: Date.now() + 10 * DAY_MS,
        lockedLender: "UWM",
        loanId: "loan123",
        contactId: "contact456",
        borrowerName: "David Lee",
      });
      expect(result).toBeNull();
    });

    test("returns null when no lock exists", () => {
      const result = checkLockExpiring({
        lockExpiration: undefined,
        lockedLender: undefined,
        loanId: "loan123",
        contactId: "contact456",
        borrowerName: "David Lee",
      });
      expect(result).toBeNull();
    });

    test("returns null for already-expired locks", () => {
      const result = checkLockExpiring({
        lockExpiration: Date.now() - 1 * DAY_MS,
        lockedLender: "UWM",
        loanId: "loan123",
        contactId: "contact456",
        borrowerName: "David Lee",
      });
      expect(result).toBeNull();
    });
  });
});
