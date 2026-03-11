import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { StagePill } from "@/components/primitives/stage-pill"

describe("StagePill", () => {
  test("renders readable stage label", () => {
    render(<StagePill stage="new_lead" />)
    expect(screen.getByText("New lead")).toBeInTheDocument()
  })

  test("uses stage group token classes", () => {
    render(<StagePill stage="new_lead" />)
    expect(screen.getByText("New lead")).toHaveClass("bg-stage-intake/15")
  })
})
