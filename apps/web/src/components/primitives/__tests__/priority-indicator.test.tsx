import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { PriorityIndicator } from "@/components/primitives/priority-indicator"

describe("PriorityIndicator", () => {
  test("renders priority dot with token color", () => {
    const { container } = render(<PriorityIndicator priority="urgent" />)
    const dot = container.querySelector('span[aria-hidden="true"]')
    expect(dot?.className).toContain("bg-priority-urgent")
  })
})
