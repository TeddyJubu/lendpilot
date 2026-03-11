/**
 * @organ shared
 * @tissue primitive/status-badge
 * @description Consistent status indicator across all organs.
 */

import * as React from "react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface StatusBadgeProps {
  status: "success" | "active" | "warning" | "danger" | "info"
  label: string
  size?: "sm" | "default"
  dot?: boolean
  className?: string
}

const statusClasses: Record<StatusBadgeProps["status"], string> = {
  success: "bg-status-success-muted text-status-success",
  active: "bg-status-active-muted text-status-active",
  warning: "bg-status-warning-muted text-status-warning",
  danger: "bg-status-danger-muted text-status-danger",
  info: "bg-status-info-muted text-status-info",
}

const dotClasses: Record<StatusBadgeProps["status"], string> = {
  success: "bg-status-success",
  active: "bg-status-active",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
  info: "bg-status-info",
}

export function StatusBadge({
  status,
  label,
  size = "default",
  dot = false,
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "border-transparent text-xs font-medium",
        statusClasses[status],
        size === "sm" ? "h-4 px-1.5 text-[11px]" : "",
        className
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn("inline-block size-2 rounded-full", dotClasses[status])}
        />
      ) : null}
      <span>{label}</span>
    </Badge>
  )
}
