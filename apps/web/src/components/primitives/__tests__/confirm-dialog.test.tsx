import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import { ConfirmDialog } from "@/components/primitives/confirm-dialog"

describe("ConfirmDialog", () => {
  test("calls onCancel when cancel clicked", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        onConfirm={() => {}}
        onCancel={onCancel}
        title="Archive?"
        description="This cannot be undone."
      />
    )

    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test("calls onConfirm when confirm clicked", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        open
        onConfirm={onConfirm}
        onCancel={() => {}}
        title="Delete?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
      />
    )

    await user.click(screen.getByRole("button", { name: "Delete" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
