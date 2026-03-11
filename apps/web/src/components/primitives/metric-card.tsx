/**
 * @organ shared
 * @tissue primitive/metric-card
 * @description KPI display for pipeline summaries.
 */

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface MetricCardProps {
  label: string
  value: string | number
  trend?: { direction: "up" | "down" | "flat"; percentage: number }
  icon?: LucideIcon
  className?: string
}

export function MetricCard({ label, value, trend, icon: Icon, className }: MetricCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUpIcon
      : trend?.direction === "down"
        ? TrendingDownIcon
        : trend?.direction === "flat"
          ? MinusIcon
          : null

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {Icon ? <Icon className="size-4 text-muted-foreground" data-testid="metric-icon" /> : null}
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {trend && TrendIcon ? (
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrendIcon className="size-3.5" data-testid="metric-trend-icon" />
            <span>{Math.abs(trend.percentage)}%</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
