/**
 * @organ shared
 * @tissue primitive/empty-state
 * @description Empty state for any view (no blank screens).
 */

"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-center",
        className
      )}
    >
      <Icon className="size-12 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {(action || secondaryAction) ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action ? (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
