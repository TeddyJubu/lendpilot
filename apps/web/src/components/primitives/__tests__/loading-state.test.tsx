import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { LoadingState } from "@/components/primitives/loading-state"

describe("LoadingState", () => {
  test("renders the requested number of items for list variant", () => {
    render(<LoadingState variant="list" count={4} />)
    expect(screen.getAllByTestId("loading-item")).toHaveLength(4)
  })
})
