import { describe, test, expect } from "vitest";
import {
  isValidContactName,
  getFullName,
  CONTACT_TYPES,
  CONTACT_SOURCES,
} from "../validators";

describe("contacts / validators tissue", () => {
  // ─── Name Validation ───
  test("accepts valid contact names", () => {
    expect(isValidContactName("John", "Doe")).toBe(true);
    expect(isValidContactName("A", "B")).toBe(true);
  });

  test("rejects empty first or last name", () => {
    expect(isValidContactName("", "Doe")).toBe(false);
    expect(isValidContactName("John", "")).toBe(false);
    expect(isValidContactName("", "")).toBe(false);
  });

  test("rejects whitespace-only names", () => {
    expect(isValidContactName("   ", "Doe")).toBe(false);
    expect(isValidContactName("John", "   ")).toBe(false);
  });

  // ─── Full Name ───
  test("getFullName combines and trims", () => {
    expect(getFullName("John", "Doe")).toBe("John Doe");
    expect(getFullName("  Jane  ", "  Smith  ")).toBe("Jane Smith");
  });

  // ─── Constants ───
  test("CONTACT_TYPES has 5 entries", () => {
    expect(CONTACT_TYPES).toHaveLength(5);
    expect(CONTACT_TYPES).toContain("lead");
    expect(CONTACT_TYPES).toContain("borrower");
    expect(CONTACT_TYPES).toContain("referral_partner");
    expect(CONTACT_TYPES).toContain("realtor");
    expect(CONTACT_TYPES).toContain("other");
  });

  test("CONTACT_SOURCES has 7 entries", () => {
    expect(CONTACT_SOURCES).toHaveLength(7);
    expect(CONTACT_SOURCES).toContain("manual");
    expect(CONTACT_SOURCES).toContain("zillow");
  });
});
