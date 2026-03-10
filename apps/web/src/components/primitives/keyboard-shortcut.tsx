/**
 * @organ shared
 * @tissue primitive/keyboard-shortcut
 * @description Display keyboard shortcut hints (e.g. Cmd+K) with consistent styling.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

export interface KeyboardShortcutProps {
  keys: string[]
  className?: string
}

export function KeyboardShortcut({ keys, className }: KeyboardShortcutProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((key, idx) => (
        <kbd
          key={`${key}-${idx}`}
          className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] leading-none text-muted-foreground"
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}
