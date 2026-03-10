import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import { AIContent } from "@/components/primitives/ai-content"

describe("AIContent", () => {
  test("renders children with reduced opacity when pending", () => {
    render(
      <AIContent status="pending" onApprove={() => {}} onReject={() => {}}>
        Hello
      </AIContent>
    )

    expect(screen.getByText("Hello")).toHaveClass("opacity-60")
  })

  test("calls onApprove when approve clicked", async () => {
    const user = userEvent.setup()
    const onApprove = vi.fn()

    render(
      <AIContent status="pending" onApprove={onApprove} onReject={() => {}}>
        Hello
      </AIContent>
    )

    await user.click(screen.getByRole("button", { name: "Approve" }))
    expect(onApprove).toHaveBeenCalledTimes(1)
  })
})
