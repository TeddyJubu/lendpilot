import { describe, test, expect } from "vitest";
import {
  rateMatchesProfile,
  isActiveRate,
  sortByBestRate,
  wholesaleVsRetailSpread,
  dedupeByLatestSnapshot,
  type RateLike,
} from "../helpers";

function makeRate(overrides: Partial<RateLike> = {}): RateLike {
  return {
    lenderId: "uwm",
    rate: 6.25,
    apr: 6.412,
    points: 0,
    lockPeriodDays: 30,
    ltvMin: 0,
    ltvMax: 80,
    ficoMin: 720,
    ficoMax: 850,
    loanAmountMin: 0,
    loanAmountMax: 1_500_000,
    productType: "30yr_fixed",
    occupancy: "Primary",
    propertyType: "SFR",
    expirationDate: Date.now() + 24 * 3600_000,
    crawledAt: Date.now(),
    source: "wholesale",
    ...overrides,
  };
}

describe("rates / helpers tissue", () => {
  describe("rateMatchesProfile", () => {
    test("matches when every dimension fits", () => {
      const rate = makeRate();
      expect(
        rateMatchesProfile(rate, {
          fico: 740,
          ltv: 75,
          loanAmount: 400_000,
          productType: "30yr_fixed",
          occupancy: "Primary",
          propertyType: "SFR",
        })
      ).toBe(true);
    });

    test("rejects FICO below the min", () => {
      const rate = makeRate({ ficoMin: 720 });
      expect(rateMatchesProfile(rate, { fico: 680 })).toBe(false);
    });

    test("rejects LTV above the max", () => {
      const rate = makeRate({ ltvMax: 80 });
      expect(rateMatchesProfile(rate, { ltv: 90 })).toBe(false);
    });

    test("rejects when product type differs", () => {
      const rate = makeRate({ productType: "30yr_fixed" });
      expect(rateMatchesProfile(rate, { productType: "15yr_fixed" })).toBe(false);
    });

    test("accepts when profile omits fields (no restriction)", () => {
      const rate = makeRate();
      expect(rateMatchesProfile(rate, {})).toBe(true);
    });

    test("rejects when loan amount falls outside range", () => {
      const rate = makeRate({ loanAmountMin: 100_000, loanAmountMax: 500_000 });
      expect(rateMatchesProfile(rate, { loanAmount: 50_000 })).toBe(false);
      expect(rateMatchesProfile(rate, { loanAmount: 750_000 })).toBe(false);
      expect(rateMatchesProfile(rate, { loanAmount: 300_000 })).toBe(true);
    });
  });

  describe("isActiveRate", () => {
    test("returns true when expiration is in the future", () => {
      expect(isActiveRate(makeRate({ expirationDate: Date.now() + 1000 }))).toBe(true);
    });

    test("returns false when expiration is in the past", () => {
      expect(isActiveRate(makeRate({ expirationDate: Date.now() - 1000 }))).toBe(false);
    });
  });

  describe("sortByBestRate", () => {
    test("orders by rate ascending", () => {
      const rates = [
        { rate: 7.0, apr: 7.1 },
        { rate: 6.25, apr: 6.4 },
        { rate: 6.5, apr: 6.6 },
      ];
      expect(sortByBestRate(rates).map((r) => r.rate)).toEqual([6.25, 6.5, 7.0]);
    });

    test("breaks rate ties by APR", () => {
      const rates = [
        { rate: 6.25, apr: 6.6 },
        { rate: 6.25, apr: 6.4 },
      ];
      expect(sortByBestRate(rates).map((r) => r.apr)).toEqual([6.4, 6.6]);
    });

    test("does not mutate the input array", () => {
      const rates = [{ rate: 7, apr: 7 }, { rate: 6, apr: 6 }];
      sortByBestRate(rates);
      expect(rates[0].rate).toBe(7);
    });
  });

  describe("wholesaleVsRetailSpread", () => {
    test("returns spread in bps when both sides exist", () => {
      const pool = [
        makeRate({ rate: 6.25, source: "wholesale" }),
        makeRate({ rate: 6.50, source: "wholesale" }),
        makeRate({ rate: 6.75, source: "retail" }),
      ];
      const spread = wholesaleVsRetailSpread(pool);
      expect(spread).not.toBeNull();
      expect(spread!.wholesale).toBe(6.25);
      expect(spread!.retail).toBe(6.75);
      expect(spread!.spreadBps).toBe(50);
    });

    test("returns null when retail side is empty", () => {
      const pool = [makeRate({ source: "wholesale" })];
      expect(wholesaleVsRetailSpread(pool)).toBeNull();
    });

    test("returns null when wholesale side is empty", () => {
      const pool = [makeRate({ source: "retail" })];
      expect(wholesaleVsRetailSpread(pool)).toBeNull();
    });
  });

  describe("dedupeByLatestSnapshot", () => {
    test("keeps only the newest snapshot per lender+product", () => {
      const rows = [
        { lenderId: "uwm", productType: "30yr_fixed", crawledAt: 100 },
        { lenderId: "uwm", productType: "30yr_fixed", crawledAt: 300 },
        { lenderId: "uwm", productType: "15yr_fixed", crawledAt: 200 },
        { lenderId: "rocket", productType: "30yr_fixed", crawledAt: 150 },
      ];
      const deduped = dedupeByLatestSnapshot(rows);
      expect(deduped).toHaveLength(3);
      const uwm30 = deduped.find(
        (r) => r.lenderId === "uwm" && r.productType === "30yr_fixed"
      );
      expect(uwm30?.crawledAt).toBe(300);
    });
  });
});
