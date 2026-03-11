"use client";

import { Settings2Icon } from "lucide-react";

import { ShellEmptyView } from "@/components/shell/shell-empty-view";

export default function SettingsPage() {
  return (
    <ShellEmptyView
      actionHref="/today"
      actionLabel="Return to Today"
      description="User preferences, integrations, and onboarding settings will expand later. This shell route provides the protected placeholder now."
      icon={Settings2Icon}
      secondaryHref="/contacts"
      secondaryLabel="Open contacts"
      title="Settings is live as a protected shell route"
    />
  );
}
