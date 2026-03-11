/**
 * @organ shell
 * @tissue empty-view
 * @description Client-side wrapper for the shared EmptyState primitive used by shell routes.
 * @depends-on
 *   - components/primitives/empty-state.tsx
 *   - Next router
 * @depended-by
 *   - app/(shell) route pages
 */

"use client";

import { startTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/primitives/empty-state";

type ShellEmptyViewProps = {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon: LucideIcon;
  secondaryHref?: string;
  secondaryLabel?: string;
  title: string;
};

export function ShellEmptyView({
  actionHref,
  actionLabel,
  description,
  icon,
  secondaryHref,
  secondaryLabel,
  title,
}: ShellEmptyViewProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-[calc(100svh-10rem)] items-center justify-center">
      <EmptyState
        action={
          actionHref && actionLabel
            ? {
                label: actionLabel,
                onClick: () => startTransition(() => router.push(actionHref)),
              }
            : undefined
        }
        className="max-w-2xl"
        description={description}
        icon={icon}
        secondaryAction={
          secondaryHref && secondaryLabel
            ? {
                label: secondaryLabel,
                onClick: () => startTransition(() => router.push(secondaryHref)),
              }
            : undefined
        }
        title={title}
      />
    </div>
  );
}
