import { describe, test, expect } from "vitest";
import { formatDisplayName, getInitials } from "../helpers";

describe("core / helpers tissue", () => {
  test("formatDisplayName trims whitespace", () => {
    expect(formatDisplayName("  John Doe  ")).toBe("John Doe");
    expect(formatDisplayName("Jane")).toBe("Jane");
  });

  test("getInitials returns first and last initial", () => {
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("Jane Marie Smith")).toBe("JS");
  });

  test("getInitials handles single name", () => {
    expect(getInitials("Cher")).toBe("C");
  });

  test("getInitials handles extra whitespace", () => {
    expect(getInitials("  John   Doe  ")).toBe("JD");
  });
});
