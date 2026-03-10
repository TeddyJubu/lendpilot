import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { InboxIcon } from "lucide-react"

import { EmptyState } from "@/components/primitives/empty-state"

describe("EmptyState", () => {
  test("invokes primary action when clicked", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <EmptyState
        icon={InboxIcon}
        title="No items"
        description="Nothing here yet"
        action={{ label: "Add", onClick }}
      />
    )

    await user.click(screen.getByRole("button", { name: "Add" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
