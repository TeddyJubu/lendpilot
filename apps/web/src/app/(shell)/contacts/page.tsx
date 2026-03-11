"use client";

import { UsersIcon } from "lucide-react";

import { ShellEmptyView } from "@/components/shell/shell-empty-view";

export default function ContactsPage() {
  return (
    <ShellEmptyView
      actionHref="/today"
      actionLabel="View Today"
      description="Contacts CRUD, search, and relationship context arrive in Phase 1. The authenticated shell is now ready to host that work."
      icon={UsersIcon}
      secondaryHref="/pipeline"
      secondaryLabel="View pipeline"
      title="Contacts will become the relationship workspace"
    />
  );
}
