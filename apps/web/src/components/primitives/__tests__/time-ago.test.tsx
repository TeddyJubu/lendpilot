import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { TimeAgo } from "@/components/primitives/time-ago"

describe("TimeAgo", () => {
  test("renders compact relative time", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"))

    render(<TimeAgo timestamp={Date.now() - 2 * 60 * 60 * 1000} />)
    expect(screen.getByText("2h ago")).toBeInTheDocument()

    vi.useRealTimers()
  })
})
