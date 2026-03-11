import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import { DetailPanel } from "@/components/primitives/detail-panel"

describe("DetailPanel", () => {
  test("renders title when open and calls onClose from close button", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <DetailPanel open onClose={onClose} title="Loan Details">
        Body
      </DetailPanel>
    )

    // Title is rendered twice (sr-only SheetTitle for a11y + visible header title).
    expect(screen.getByRole("dialog", { name: "Loan Details" })).toBeInTheDocument()
    await user.click(screen.getByTestId("detail-panel-close"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
