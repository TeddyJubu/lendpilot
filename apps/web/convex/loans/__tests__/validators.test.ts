import { describe, test, expect } from "vitest";
import {
  isValidFico,
  isValidLtv,
  isValidDti,
  isValidLoanAmount,
  isValidRate,
} from "../validators";

describe("loans / validators tissue", () => {
  // ─── FICO ───
  test("accepts valid FICO scores", () => {
    expect(isValidFico(300)).toBe(true);
    expect(isValidFico(740)).toBe(true);
    expect(isValidFico(850)).toBe(true);
  });

  test("rejects invalid FICO scores", () => {
    expect(isValidFico(299)).toBe(false);
    expect(isValidFico(851)).toBe(false);
    expect(isValidFico(0)).toBe(false);
    expect(isValidFico(-1)).toBe(false);
    expect(isValidFico(740.5)).toBe(false); // not integer
  });

  // ─── LTV ───
  test("accepts valid LTV percentages", () => {
    expect(isValidLtv(80)).toBe(true);
    expect(isValidLtv(95)).toBe(true);
    expect(isValidLtv(0.5)).toBe(true);
    expect(isValidLtv(100)).toBe(true);
  });

  test("rejects invalid LTV percentages", () => {
    expect(isValidLtv(0)).toBe(false);
    expect(isValidLtv(-5)).toBe(false);
    expect(isValidLtv(101)).toBe(false);
  });

  // ─── DTI ───
  test("accepts valid DTI percentages", () => {
    expect(isValidDti(43)).toBe(true);
    expect(isValidDti(50)).toBe(true);
  });

  test("rejects invalid DTI percentages", () => {
    expect(isValidDti(0)).toBe(false);
    expect(isValidDti(-1)).toBe(false);
    expect(isValidDti(101)).toBe(false);
  });

  // ─── Loan Amount ───
  test("accepts valid loan amounts", () => {
    expect(isValidLoanAmount(100000)).toBe(true);
    expect(isValidLoanAmount(1)).toBe(true);
    expect(isValidLoanAmount(50000000)).toBe(true);
  });

  test("rejects invalid loan amounts", () => {
    expect(isValidLoanAmount(0)).toBe(false);
    expect(isValidLoanAmount(-100000)).toBe(false);
    expect(isValidLoanAmount(50000001)).toBe(false);
  });

  // ─── Rate ───
  test("accepts valid rates", () => {
    expect(isValidRate(0)).toBe(true);
    expect(isValidRate(6.5)).toBe(true);
    expect(isValidRate(20)).toBe(true);
  });

  test("rejects invalid rates", () => {
    expect(isValidRate(-1)).toBe(false);
    expect(isValidRate(21)).toBe(false);
  });
});
