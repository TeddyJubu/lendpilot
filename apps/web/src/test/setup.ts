/**
 * @organ core
 * @tissue tests
 * @description Global test setup for Vitest.
 *   Provides DOM matchers + cleanup for React Testing Library.
 * @ai-notes
 *   - Keep this file dependency-light. Prefer app-level test utilities in test files.
 */

import "@testing-library/jest-dom/vitest"

import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => {
  if (typeof document === "undefined") {
    return
  }
  cleanup()
})
