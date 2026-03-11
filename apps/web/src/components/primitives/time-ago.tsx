/**
 * @organ shared
 * @tissue primitive/time-ago
 * @description Consistent relative timestamps ("2h ago", "3d ago").
 */

import * as React from "react"

import { cn } from "@/lib/utils"

export interface TimeAgoProps {
  timestamp: number
  className?: string
}

export function formatTimeAgo(timestamp: number, now: number) {
  const diffMs = Math.max(0, now - timestamp)
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 45) return "just now"

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`

  const diffMo = Math.floor(diffDay / 30)
  if (diffMo < 12) return `${diffMo}mo ago`

  const diffYr = Math.floor(diffMo / 12)
  return `${diffYr}y ago`
}

export function TimeAgo({ timestamp, className }: TimeAgoProps) {
  const label = formatTimeAgo(timestamp, Date.now())
  return (
    <span
      className={cn("text-xs text-muted-foreground", className)}
      title={new Date(timestamp).toLocaleString()}
    >
      {label}
    </span>
  )
}
