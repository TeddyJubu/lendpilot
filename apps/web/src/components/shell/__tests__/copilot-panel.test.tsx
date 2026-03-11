import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { CopilotPanel } from "@/components/shell/copilot-panel"

describe("CopilotPanel", () => {
  test("renders an accessible sheet dialog name and description when open", () => {
    render(
      <CopilotPanel
        contextLabel="Today"
        open
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByRole("dialog", { name: "Copilot panel" })).toBeInTheDocument()
    expect(
      screen.getByText("Review contextual AI guidance and draft the next shell action."),
    ).toBeInTheDocument()
  })
})
