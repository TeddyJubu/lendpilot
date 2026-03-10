import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  uuid,
  now,
  addHours,
  addDays,
  normalizeAddress,
  isValidRate,
  isValidApr,
  isValidFico,
  isValidPropertyValue,
  sleep,
  truncate,
} from "../helpers";

// ─── uuid ───

describe("uuid", () => {
  test("returns a string", () => {
    expect(typeof uuid()).toBe("string");
  });

  test("generates unique values", () => {
    const a = uuid();
    const b = uuid();
    expect(a).not.toBe(b);
  });

  test("matches UUID v4 format", () => {
    const id = uuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});

// ─── now ───

describe("now", () => {
  test("returns an ISO 8601 string", () => {
    const result = now();
    expect(() => new Date(result)).not.toThrow();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test("is close to the current time", () => {
    const before = Date.now();
    const result = now();
    const after = Date.now();
    const ts = new Date(result).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 100);
  });
});

// ─── addHours ───

describe("addHours", () => {
  test("adds hours to a date", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    const result = addHours(base, 24);
    expect(new Date(result).toISOString()).toBe("2024-01-02T00:00:00.000Z");
  });

  test("handles fractional hours", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    const result = addHours(base, 0.5);
    expect(new Date(result).toISOString()).toBe("2024-01-01T00:30:00.000Z");
  });

  test("returns an ISO string", () => {
    const result = addHours(new Date(), 1);
    expect(() => new Date(result)).not.toThrow();
  });
});

// ─── addDays ───

describe("addDays", () => {
  test("adds days to a date", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    const result = addDays(base, 7);
    expect(new Date(result).toISOString()).toBe("2024-01-08T00:00:00.000Z");
  });

  test("adds a single day correctly", () => {
    const base = new Date("2024-01-31T12:00:00Z");
    const result = addDays(base, 1);
    expect(new Date(result).toISOString()).toBe("2024-02-01T12:00:00.000Z");
  });

  test("returns an ISO string", () => {
    const result = addDays(new Date(), 30);
    expect(() => new Date(result)).not.toThrow();
  });
});

// ─── normalizeAddress ───

describe("normalizeAddress", () => {
  test("lowercases the input", () => {
    expect(normalizeAddress("123 Main Street")).toContain("main");
  });

  test("removes periods", () => {
    expect(normalizeAddress("123 St. Ave.")).not.toContain(".");
  });

  test("removes commas", () => {
    expect(normalizeAddress("123 Main, CA")).not.toContain(",");
  });

  test("collapses multiple spaces", () => {
    expect(normalizeAddress("123  Main   St")).toBe("123 main st");
  });

  test("abbreviates Street to st", () => {
    expect(normalizeAddress("123 Main Street")).toBe("123 main st");
  });

  test("abbreviates Avenue to ave", () => {
    expect(normalizeAddress("456 Oak Avenue")).toBe("456 oak ave");
  });

  test("abbreviates Boulevard to blvd", () => {
    expect(normalizeAddress("789 Sunset Boulevard")).toBe("789 sunset blvd");
  });

  test("abbreviates Drive to dr", () => {
    expect(normalizeAddress("10 Elm Drive")).toBe("10 elm dr");
  });

  test("abbreviates Road to rd", () => {
    expect(normalizeAddress("1 Country Road")).toBe("1 country rd");
  });

  test("abbreviates Lane to ln", () => {
    expect(normalizeAddress("5 Oak Lane")).toBe("5 oak ln");
  });

  test("abbreviates Court to ct", () => {
    expect(normalizeAddress("8 Rose Court")).toBe("8 rose ct");
  });

  test("abbreviates Apartment to apt", () => {
    expect(normalizeAddress("123 Main Apartment 4")).toBe("123 main apt 4");
  });

  test("abbreviates Suite to ste", () => {
    expect(normalizeAddress("100 Office Suite 200")).toBe("100 office ste 200");
  });

  test("trims leading/trailing whitespace", () => {
    expect(normalizeAddress("  123 Main St  ")).toBe("123 main st");
  });

  test("already-abbreviated inputs remain stable", () => {
    const normalized = normalizeAddress("123 main st");
    expect(normalized).toBe("123 main st");
  });
});

// ─── isValidRate ───

describe("isValidRate", () => {
  test("accepts a normal mortgage rate (6.5%)", () => {
    expect(isValidRate(6.5)).toBe(true);
  });

  test("accepts minimum boundary (2.0%)", () => {
    expect(isValidRate(2.0)).toBe(true);
  });

  test("accepts maximum boundary (15.0%)", () => {
    expect(isValidRate(15.0)).toBe(true);
  });

  test("rejects rate below 2%", () => {
    expect(isValidRate(1.99)).toBe(false);
  });

  test("rejects rate above 15%", () => {
    expect(isValidRate(15.01)).toBe(false);
  });

  test("rejects zero", () => {
    expect(isValidRate(0)).toBe(false);
  });

  test("rejects negative rate", () => {
    expect(isValidRate(-1)).toBe(false);
  });
});

// ─── isValidApr ───

describe("isValidApr", () => {
  test("accepts APR equal to rate", () => {
    expect(isValidApr(6.5, 6.5)).toBe(true);
  });

  test("accepts APR greater than rate", () => {
    expect(isValidApr(6.5, 6.75)).toBe(true);
  });

  test("rejects APR less than rate", () => {
    expect(isValidApr(6.5, 6.4)).toBe(false);
  });

  test("rejects APR significantly below rate", () => {
    expect(isValidApr(7.0, 5.0)).toBe(false);
  });
});

// ─── isValidFico ───

describe("isValidFico", () => {
  test("accepts typical FICO score (720)", () => {
    expect(isValidFico(720)).toBe(true);
  });

  test("accepts minimum boundary (300)", () => {
    expect(isValidFico(300)).toBe(true);
  });

  test("accepts maximum boundary (850)", () => {
    expect(isValidFico(850)).toBe(true);
  });

  test("rejects score below 300", () => {
    expect(isValidFico(299)).toBe(false);
  });

  test("rejects score above 850", () => {
    expect(isValidFico(851)).toBe(false);
  });

  test("rejects zero", () => {
    expect(isValidFico(0)).toBe(false);
  });
});

// ─── isValidPropertyValue ───

describe("isValidPropertyValue", () => {
  test("accepts typical home value ($500k)", () => {
    expect(isValidPropertyValue(500_000)).toBe(true);
  });

  test("accepts minimum boundary ($10k)", () => {
    expect(isValidPropertyValue(10_000)).toBe(true);
  });

  test("accepts maximum boundary ($50M)", () => {
    expect(isValidPropertyValue(50_000_000)).toBe(true);
  });

  test("rejects value below $10k", () => {
    expect(isValidPropertyValue(9_999)).toBe(false);
  });

  test("rejects value above $50M", () => {
    expect(isValidPropertyValue(50_000_001)).toBe(false);
  });

  test("rejects zero", () => {
    expect(isValidPropertyValue(0)).toBe(false);
  });

  test("rejects negative value", () => {
    expect(isValidPropertyValue(-100)).toBe(false);
  });
});

// ─── sleep ───

describe("sleep", () => {
  test("resolves after the given duration", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some variance
  });

  test("resolves with undefined", async () => {
    const result = await sleep(0);
    expect(result).toBeUndefined();
  });
});

// ─── truncate ───

describe("truncate", () => {
  test("returns the original string if shorter than maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  test("returns the original string if equal to maxLength", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  test("truncates and appends '...' when too long", () => {
    const result = truncate("hello world", 8);
    expect(result).toBe("hello...");
    expect(result.length).toBe(8);
  });

  test("handles empty string", () => {
    expect(truncate("", 10)).toBe("");
  });

  test("truncates very long string", () => {
    const long = "a".repeat(1000);
    const result = truncate(long, 10);
    expect(result.length).toBe(10);
    expect(result.endsWith("...")).toBe(true);
  });
});
