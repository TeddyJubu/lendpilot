import { describe, test, expect } from "vitest";
import {
  isValidRate,
  isValidApr,
  isValidFico,
  isValidLtv,
  isCleanRateRecord,
} from "../validators";

describe("rates / validators tissue", () => {
  describe("isValidRate", () => {
    test("accepts rates in the 2-15 range", () => {
      expect(isValidRate(6.25)).toBe(true);
      expect(isValidRate(2.0)).toBe(true);
      expect(isValidRate(15.0)).toBe(true);
    });

    test("rejects out-of-band rates", () => {
      expect(isValidRate(1.9)).toBe(false);
      expect(isValidRate(15.1)).toBe(false);
      expect(isValidRate(0)).toBe(false);
      expect(isValidRate(-1)).toBe(false);
    });

    test("rejects non-finite numbers", () => {
      expect(isValidRate(NaN)).toBe(false);
      expect(isValidRate(Infinity)).toBe(false);
    });
  });

  describe("isValidApr", () => {
    test("APR equal to or greater than rate is valid", () => {
      expect(isValidApr(6.0, 6.0)).toBe(true);
      expect(isValidApr(6.0, 6.412)).toBe(true);
    });

    test("APR below rate is invalid (fees always push APR up)", () => {
      expect(isValidApr(6.0, 5.9)).toBe(false);
    });
  });

  describe("isValidFico", () => {
    test.each([300, 620, 720, 850])("accepts %i", (fico) => {
      expect(isValidFico(fico)).toBe(true);
    });

    test("rejects out-of-range or non-integer", () => {
      expect(isValidFico(299)).toBe(false);
      expect(isValidFico(851)).toBe(false);
      expect(isValidFico(700.5)).toBe(false);
    });
  });

  describe("isValidLtv", () => {
    test("accepts 0 to 125 (allows some above-100 products)", () => {
      expect(isValidLtv(0)).toBe(true);
      expect(isValidLtv(80)).toBe(true);
      expect(isValidLtv(125)).toBe(true);
    });

    test("rejects negatives and huge values", () => {
      expect(isValidLtv(-1)).toBe(false);
      expect(isValidLtv(200)).toBe(false);
    });
  });

  describe("isCleanRateRecord", () => {
    const base = {
      rate: 6.25,
      apr: 6.412,
      ficoMin: 700,
      ficoMax: 850,
      ltvMin: 0,
      ltvMax: 80,
    };

    test("accepts a valid record", () => {
      expect(isCleanRateRecord(base)).toBe(true);
    });

    test("rejects when rate is below floor", () => {
      expect(isCleanRateRecord({ ...base, rate: 1.0, apr: 1.0 })).toBe(false);
    });

    test("rejects when APR < rate", () => {
      expect(isCleanRateRecord({ ...base, apr: 5.5 })).toBe(false);
    });

    test("rejects when FICO max is above 850", () => {
      expect(isCleanRateRecord({ ...base, ficoMax: 999 })).toBe(false);
    });

    test("allows records without optional FICO/LTV bounds", () => {
      expect(
        isCleanRateRecord({
          rate: 6.25,
          apr: 6.25,
        })
      ).toBe(true);
    });
  });
});
