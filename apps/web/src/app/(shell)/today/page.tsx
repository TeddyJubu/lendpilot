"use client";

import { LayoutListIcon } from "lucide-react";

import { ShellEmptyView } from "@/components/shell/shell-empty-view";

export default function TodayPage() {
  return (
    <ShellEmptyView
      actionHref="/pipeline"
      actionLabel="Review pipeline"
      description="Rule-based feed generation lands in Phase 5. For now, this shell proves routing, auth, and command surfaces."
      icon={LayoutListIcon}
      secondaryHref="/contacts"
      secondaryLabel="Browse contacts"
      title="Today will become your broker action feed"
    />
  );
}
