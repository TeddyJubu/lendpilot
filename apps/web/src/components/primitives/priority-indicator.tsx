/**
 * @organ shared
 * @tissue primitive/priority-indicator
 * @description Visual priority marker for feed items.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

export interface PriorityIndicatorProps {
  priority: "urgent" | "high" | "medium" | "low"
  showLabel?: boolean
  className?: string
}

const priorityDot: Record<PriorityIndicatorProps["priority"], string> = {
  urgent: "bg-priority-urgent",
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
}

const priorityLabel: Record<PriorityIndicatorProps["priority"], string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}

export function PriorityIndicator({
  priority,
  showLabel = false,
  className,
}: PriorityIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot[priority])}
      />
      {showLabel ? (
        <span className="text-xs text-muted-foreground">
          {priorityLabel[priority]}
        </span>
      ) : null}
    </span>
  )
}
