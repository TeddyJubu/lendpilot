/**
 * @organ shared
 * @tissue primitive/loading-state
 * @description Consistent skeleton loading for all views (no spinners).
 */

import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface LoadingStateProps {
  variant: "list" | "card" | "kanban" | "detail" | "feed"
  count?: number
  className?: string
}

export function LoadingState({ variant, count = 3, className }: LoadingStateProps) {
  if (variant === "kanban") {
    return (
      <div className={cn("grid gap-4 md:grid-cols-3", className)} data-testid="loading-state">
        {Array.from({ length: 3 }).map((_, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-3" data-testid="loading-item">
            <Skeleton className="h-6 w-24" />
            {Array.from({ length: count }).map((__, idx) => (
              <Skeleton key={idx} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (variant === "detail") {
    return (
      <div className={cn("flex flex-col gap-4", className)} data-testid="loading-state">
        <Skeleton className="h-7 w-2/3" data-testid="loading-item" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: Math.max(4, count) }).map((_, idx) => (
            <Skeleton key={idx} className="h-4 w-full" data-testid="loading-item" />
          ))}
        </div>
      </div>
    )
  }

  if (variant === "feed") {
    return (
      <div className={cn("flex flex-col gap-3", className)} data-testid="loading-state">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border p-4"
            data-testid="loading-item"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={cn("grid gap-4 md:grid-cols-3", className)} data-testid="loading-state">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border p-4"
            data-testid="loading-item"
          >
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-3 h-9 w-32" />
            <Skeleton className="mt-3 h-3 w-16" />
          </div>
        ))}
      </div>
    )
  }

  // list
  return (
    <div className={cn("flex flex-col gap-3", className)} data-testid="loading-state">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 rounded-xl border border-border p-3"
          data-testid="loading-item"
        >
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
