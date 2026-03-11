/**
 * @organ shared
 * @tissue primitive/ai-content
 * @description Wrap AI-generated content with review state (pending/approved/rejected).
 */

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface AIContentProps {
  children: React.ReactNode
  status: "pending" | "approved" | "rejected"
  onApprove?: () => void
  onReject?: () => void
  className?: string
}

export function AIContent({
  children,
  status,
  onApprove,
  onReject,
  className,
}: AIContentProps) {
  const isPending = status === "pending"

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        isPending ? "border-l-2 border-l-status-active" : "",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">AI-generated</span>
        {isPending ? (
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={onReject}
              disabled={!onReject}
            >
              Reject
            </Button>
            <Button size="xs" onClick={onApprove} disabled={!onApprove}>
              Approve
            </Button>
          </div>
        ) : null}
      </div>

      <div className={cn(isPending ? "opacity-60" : "opacity-100")}>{children}</div>
    </div>
  )
}
