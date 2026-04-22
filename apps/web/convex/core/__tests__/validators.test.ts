import { describe, test, expect } from "vitest";
import { isValidEmail, isValidNmlsId, isValidPhone } from "../validators";

describe("core / validators tissue", () => {
  // ─── Email ───
  test("accepts valid email addresses", () => {
    expect(isValidEmail("broker@loanpilot.com")).toBe(true);
    expect(isValidEmail("john.doe@example.co")).toBe(true);
    expect(isValidEmail("a@b.c")).toBe(true);
  });

  test("rejects invalid email addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("@no-local.com")).toBe(false);
    expect(isValidEmail("no-domain@")).toBe(false);
    expect(isValidEmail("spaces in@email.com")).toBe(false);
  });

  // ─── NMLS ID ───
  test("accepts valid NMLS IDs (5-12 digits)", () => {
    expect(isValidNmlsId("12345")).toBe(true);
    expect(isValidNmlsId("123456789")).toBe(true);
    expect(isValidNmlsId("123456789012")).toBe(true);
  });

  test("rejects invalid NMLS IDs", () => {
    expect(isValidNmlsId("")).toBe(false);
    expect(isValidNmlsId("1234")).toBe(false); // too short
    expect(isValidNmlsId("1234567890123")).toBe(false); // too long
    expect(isValidNmlsId("abc12")).toBe(false); // letters
    expect(isValidNmlsId("12 34 5")).toBe(false); // spaces
  });

  // ─── Phone ───
  test("accepts valid phone numbers", () => {
    expect(isValidPhone("5551234567")).toBe(true);
    expect(isValidPhone("+15551234567")).toBe(true);
    expect(isValidPhone("(555) 123-4567")).toBe(true);
    expect(isValidPhone("555.123.4567")).toBe(true);
    expect(isValidPhone("+44 20 7946 0958")).toBe(true);
  });

  test("rejects invalid phone numbers", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("123")).toBe(false); // too short
    expect(isValidPhone("abcdefghij")).toBe(false); // letters
  });
});
