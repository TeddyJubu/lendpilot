import { describe, test, expect } from "vitest";
import {
  getContactTypeLabel,
  getContactInitials,
  sortContactsByName,
  wasRecentlyContacted,
  isTouchOverdue,
} from "../helpers";

describe("contacts / helpers tissue", () => {
  // ─── Type Labels ───
  test("getContactTypeLabel returns correct labels", () => {
    expect(getContactTypeLabel("lead")).toBe("Lead");
    expect(getContactTypeLabel("borrower")).toBe("Borrower");
    expect(getContactTypeLabel("referral_partner")).toBe("Referral Partner");
    expect(getContactTypeLabel("realtor")).toBe("Realtor");
    expect(getContactTypeLabel("other")).toBe("Other");
  });

  // ─── Initials ───
  test("getContactInitials returns first letter of each name", () => {
    expect(getContactInitials("John", "Doe")).toBe("JD");
    expect(getContactInitials("jane", "smith")).toBe("JS");
  });

  test("getContactInitials handles whitespace", () => {
    expect(getContactInitials("  John  ", "  Doe  ")).toBe("JD");
  });

  // ─── Sorting ───
  test("sortContactsByName sorts by last name, then first", () => {
    const contacts = [
      { firstName: "Zoe", lastName: "Adams" },
      { firstName: "Alice", lastName: "Adams" },
      { firstName: "Bob", lastName: "Williams" },
    ];
    const sorted = sortContactsByName(contacts);
    expect(sorted[0].firstName).toBe("Alice");
    expect(sorted[1].firstName).toBe("Zoe");
    expect(sorted[2].firstName).toBe("Bob");
  });

  test("sortContactsByName doesn't mutate original", () => {
    const contacts = [
      { firstName: "B", lastName: "Z" },
      { firstName: "A", lastName: "A" },
    ];
    const sorted = sortContactsByName(contacts);
    expect(contacts[0].firstName).toBe("B"); // original unchanged
    expect(sorted[0].firstName).toBe("A");
  });

  // ─── Recently Contacted ───
  test("wasRecentlyContacted returns true if within window", () => {
    const now = Date.now();
    expect(wasRecentlyContacted(now - 1000, 7)).toBe(true); // 1 second ago, within 7 days
    expect(wasRecentlyContacted(now - 3 * 24 * 60 * 60 * 1000, 7)).toBe(true); // 3 days ago
  });

  test("wasRecentlyContacted returns false if outside window", () => {
    const now = Date.now();
    expect(wasRecentlyContacted(now - 10 * 24 * 60 * 60 * 1000, 7)).toBe(false); // 10 days ago
  });

  test("wasRecentlyContacted returns false for undefined", () => {
    expect(wasRecentlyContacted(undefined, 7)).toBe(false);
  });

  // ─── Touch Overdue ───
  test("isTouchOverdue returns true if past due", () => {
    expect(isTouchOverdue(Date.now() - 1000)).toBe(true);
  });

  test("isTouchOverdue returns false if not yet due", () => {
    expect(isTouchOverdue(Date.now() + 1000 * 60 * 60)).toBe(false);
  });

  test("isTouchOverdue returns false for undefined", () => {
    expect(isTouchOverdue(undefined)).toBe(false);
  });
});
