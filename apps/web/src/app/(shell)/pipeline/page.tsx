"use client";

import { WorkflowIcon } from "lucide-react";

import { ShellEmptyView } from "@/components/shell/shell-empty-view";

export default function PipelinePage() {
  return (
    <ShellEmptyView
      actionHref="/contacts"
      actionLabel="Open contacts"
      description="Loan stages, kanban movement, and stage history arrive in Phase 2. This view is the shell skeleton the organ will plug into."
      icon={WorkflowIcon}
      secondaryHref="/today"
      secondaryLabel="Back to Today"
      title="Pipeline is ready for the loans organ"
    />
  );
}
