import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { DollarSignIcon } from "lucide-react"

import { MetricCard } from "@/components/primitives/metric-card"

describe("MetricCard", () => {
  test("renders label and value", () => {
    render(<MetricCard label="Pipeline" value={12} />)
    expect(screen.getByText("Pipeline")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
  })

  test("renders trend + icon when provided", () => {
    render(
      <MetricCard
        label="Revenue"
        value="$1,200"
        icon={DollarSignIcon}
        trend={{ direction: "up", percentage: 12 }}
      />
    )

    expect(screen.getByTestId("metric-icon")).toBeInTheDocument()
    expect(screen.getByTestId("metric-trend-icon")).toBeInTheDocument()
    expect(screen.getByText("12%")).toBeInTheDocument()
  })
})
