import { describe, test, expect } from "vitest";
import {
  normalizeAddress,
  isValidRate,
  isValidApr,
  isValidFico,
  isValidPropertyValue,
  truncate,
  addHours,
  addDays,
} from "../helpers";

describe("worker / utils / helpers", () => {
  describe("normalizeAddress", () => {
    test("lowercases, strips punctuation, and collapses whitespace", () => {
      expect(normalizeAddress("  123 Main St.,  Austin, TX ")).toBe(
        "123 main st austin tx"
      );
    });

    test("expands common street-type abbreviations consistently", () => {
      expect(normalizeAddress("123 Main Street")).toBe("123 main st");
      expect(normalizeAddress("456 Oak Avenue")).toBe("456 oak ave");
      expect(normalizeAddress("789 Pine Boulevard")).toBe("789 pine blvd");
      expect(normalizeAddress("10 Elm Drive")).toBe("10 elm dr");
      expect(normalizeAddress("22 Cedar Road")).toBe("22 cedar rd");
      expect(normalizeAddress("5 Birch Lane")).toBe("5 birch ln");
      expect(normalizeAddress("1 Maple Court")).toBe("1 maple ct");
    });

    test("expands apartment and suite", () => {
      expect(normalizeAddress("1 Main St Apartment 4B")).toBe("1 main st apt 4b");
      expect(normalizeAddress("1 Main St Suite 200")).toBe("1 main st ste 200");
    });

    test("same address with different casing/punctuation normalizes to same key", () => {
      expect(normalizeAddress("123 Main St., Apt. 4B")).toBe(
        normalizeAddress("  123  MAIN  street APARTMENT 4B  ")
      );
    });
  });

  describe("isValidRate", () => {
    test("accepts reasonable mortgage rates", () => {
      expect(isValidRate(6.25)).toBe(true);
      expect(isValidRate(2.0)).toBe(true);
      expect(isValidRate(15.0)).toBe(true);
    });

    test("rejects implausible rates", () => {
      expect(isValidRate(1.9)).toBe(false);
      expect(isValidRate(15.1)).toBe(false);
      expect(isValidRate(0)).toBe(false);
    });
  });

  describe("isValidApr", () => {
    test("APR must be >= rate", () => {
      expect(isValidApr(6.25, 6.5)).toBe(true);
      expect(isValidApr(6.25, 6.25)).toBe(true);
      expect(isValidApr(6.25, 6.0)).toBe(false);
    });
  });

  describe("isValidFico", () => {
    test("accepts the valid FICO band", () => {
      expect(isValidFico(300)).toBe(true);
      expect(isValidFico(720)).toBe(true);
      expect(isValidFico(850)).toBe(true);
    });

    test("rejects out-of-band values", () => {
      expect(isValidFico(299)).toBe(false);
      expect(isValidFico(851)).toBe(false);
    });
  });

  describe("isValidPropertyValue", () => {
    test("accepts plausible home values", () => {
      expect(isValidPropertyValue(250_000)).toBe(true);
      expect(isValidPropertyValue(10_000)).toBe(true);
      expect(isValidPropertyValue(50_000_000)).toBe(true);
    });

    test("rejects numbers outside the plausible band", () => {
      expect(isValidPropertyValue(9_999)).toBe(false);
      expect(isValidPropertyValue(50_000_001)).toBe(false);
    });
  });

  describe("truncate", () => {
    test("leaves short strings untouched", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    test("cuts long strings and appends ellipsis", () => {
      expect(truncate("abcdefghij", 6)).toBe("abc...");
    });
  });

  describe("addHours / addDays", () => {
    test("returns ISO strings for future times", () => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      expect(addHours(now, 24)).toBe("2026-01-02T00:00:00.000Z");
      expect(addDays(now, 7)).toBe("2026-01-08T00:00:00.000Z");
    });
  });
});
