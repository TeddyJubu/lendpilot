/**
 * @organ shared
 * @tissue primitive/stage-pill
 * @description Pipeline stage indicator on loan cards.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

export type LoanStage =
  | "new_lead"
  | "scored"
  | "contacted"
  | "pre_qualified"
  | "application_filed"
  | "docs_collecting"
  | "submitted_to_lender"
  | "in_underwriting"
  | "conditions"
  | "clear_to_close"
  | "closing_scheduled"
  | "funded"
  | "withdrawn"
  | "denied"

export interface StagePillProps {
  stage: LoanStage
  size?: "sm" | "default"
  className?: string
}

const STAGE_GROUP: Record<LoanStage, string> = {
  new_lead: "intake",
  scored: "intake",
  contacted: "intake",
  pre_qualified: "qualification",
  application_filed: "qualification",
  docs_collecting: "qualification",
  submitted_to_lender: "processing",
  in_underwriting: "processing",
  conditions: "processing",
  clear_to_close: "closing",
  closing_scheduled: "closing",
  funded: "terminal-success",
  withdrawn: "terminal-fail",
  denied: "terminal-fail",
}

const GROUP_CLASSES: Record<string, string> = {
  intake: "bg-stage-intake/15 text-stage-intake border-stage-intake/20",
  qualification:
    "bg-stage-qualification/15 text-stage-qualification border-stage-qualification/20",
  processing: "bg-stage-processing/15 text-stage-processing border-stage-processing/20",
  closing: "bg-stage-closing/15 text-stage-closing border-stage-closing/20",
  "terminal-success":
    "bg-stage-terminal-success/15 text-stage-terminal-success border-stage-terminal-success/20",
  "terminal-fail":
    "bg-stage-terminal-fail/15 text-stage-terminal-fail border-stage-terminal-fail/20",
}

const LABELS: Partial<Record<LoanStage, string>> = {
  new_lead: "New lead",
  pre_qualified: "Pre-qualified",
  application_filed: "Application filed",
  docs_collecting: "Docs collecting",
  submitted_to_lender: "Submitted to lender",
  in_underwriting: "In underwriting",
  clear_to_close: "Clear to close",
  closing_scheduled: "Closing scheduled",
}

function titleCase(stage: string) {
  return stage
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function StagePill({ stage, size = "default", className }: StagePillProps) {
  const group = STAGE_GROUP[stage]
  const label = LABELS[stage] ?? titleCase(stage)

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        GROUP_CLASSES[group],
        size === "sm" ? "px-1.5 text-[11px]" : "",
        className
      )}
      title={label}
    >
      {label}
    </span>
  )
}
