import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { StatusBadge } from "@/components/primitives/status-badge"

describe("StatusBadge", () => {
  test("applies status token classes", () => {
    render(<StatusBadge status="success" label="Approved" />)

    const badge = screen.getByText("Approved").closest('[data-slot="badge"]')
    expect(badge).toBeTruthy()
    expect(badge).toHaveClass("bg-status-success-muted")
    expect(badge).toHaveClass("text-status-success")
  })

  test("renders leading dot when dot=true", () => {
    const { container } = render(
      <StatusBadge status="warning" label="Needs review" dot />
    )
    const dot = container.querySelector('span[aria-hidden="true"]')
    expect(dot).toBeTruthy()
    expect(dot?.className).toContain("bg-status-warning")
  })
})
