import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { UserAvatar } from "@/components/primitives/user-avatar"

describe("UserAvatar", () => {
  test("shows initials fallback when imageUrl is missing", () => {
    render(<UserAvatar name="John Smith" />)
    expect(screen.getByText("JS")).toBeInTheDocument()
  })

  test("renders image when imageUrl is provided", () => {
    const { container } = render(
      <UserAvatar name="John Smith" imageUrl="https://example.com/a.png" />
    )

    // Radix AvatarImage may start hidden/unmounted until load; assert wiring via data-slot.
    const image = container.querySelector('[data-slot="avatar-image"]')
    expect(image).toBeTruthy()
  })
})
