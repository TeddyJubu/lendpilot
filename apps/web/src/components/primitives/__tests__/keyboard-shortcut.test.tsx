import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { KeyboardShortcut } from "@/components/primitives/keyboard-shortcut"

describe("KeyboardShortcut", () => {
  test("renders a kbd for each key", () => {
    render(<KeyboardShortcut keys={["Cmd", "K"]} />)

    const keys = screen.getAllByText(/Cmd|K/)
    expect(keys).toHaveLength(2)
    expect(screen.getByText("Cmd").tagName.toLowerCase()).toBe("kbd")
    expect(screen.getByText("K").tagName.toLowerCase()).toBe("kbd")
  })
})
