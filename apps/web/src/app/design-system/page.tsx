/**
 * @organ shell
 * @tissue design-system-gallery
 * @description Internal gallery page for verifying shadcn Layer 1 and LoanPilot primitives.
 *   This is a Foundation-only tool page (M0.4) and is intentionally not product UI.
 * @depends-on
 *   - components/ui/* (shadcn generated components)
 *   - components/shell/theme-provider.tsx (theme context)
 * @ai-notes
 *   - Keep this page lightweight: no Convex, no Clerk, no feature wiring.
 */

"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { KeyboardShortcut } from "@/components/primitives/keyboard-shortcut";
import { TimeAgo } from "@/components/primitives/time-ago";
import { UserAvatar } from "@/components/primitives/user-avatar";
import { StatusBadge } from "@/components/primitives/status-badge";
import { PriorityIndicator } from "@/components/primitives/priority-indicator";
import { StagePill } from "@/components/primitives/stage-pill";
import { MetricCard } from "@/components/primitives/metric-card";
import { EmptyState } from "@/components/primitives/empty-state";
import { AIContent } from "@/components/primitives/ai-content";
import { LoadingState } from "@/components/primitives/loading-state";
import { DetailPanel } from "@/components/primitives/detail-panel";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

import { SparklesIcon } from "lucide-react";

const EXAMPLE_TIMEAGO_TIMESTAMP = new Date("2026-03-11T15:49:01.000Z").getTime();

export default function DesignSystemPage() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const resolved = mounted ? (theme === "system" ? systemTheme : theme) : undefined;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Design System</h1>
          <p className="text-sm text-muted-foreground">
            M0.4 verification page for tokens, shadcn base components, primitives, and
            dark mode.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Theme: {resolved ?? "loading"}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
              disabled={!mounted}
            >
              Toggle theme
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTheme("system")} disabled={!mounted}>
              System
            </Button>
          </div>
        </header>

        <Separator />

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight">
                shadcn Layer 1 (smoke)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ds-input">Input</Label>
                <Input id="ds-input" placeholder="Type here..." />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>Badge</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Primitives (Layer 2)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status="success" label="Success" dot />
                  <StatusBadge status="active" label="Active" dot />
                  <StatusBadge status="warning" label="Warning" dot />
                  <StatusBadge status="danger" label="Danger" dot />
                  <StatusBadge status="info" label="Info" dot />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <PriorityIndicator priority="urgent" showLabel />
                  <PriorityIndicator priority="high" showLabel />
                  <PriorityIndicator priority="medium" showLabel />
                  <PriorityIndicator priority="low" showLabel />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StagePill stage="new_lead" />
                  <StagePill stage="in_underwriting" />
                  <StagePill stage="funded" />
                  <StagePill stage="denied" />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <UserAvatar name="John Smith" size="xs" />
                  <UserAvatar name="John Smith" size="sm" />
                  <UserAvatar name="John Smith" size="md" />
                  <UserAvatar name="John Smith" size="lg" />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <KeyboardShortcut keys={["Cmd", "K"]} />
                  <TimeAgo timestamp={EXAMPLE_TIMEAGO_TIMESTAMP} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <MetricCard label="Pipeline" value={12} trend={{ direction: "up", percentage: 8 }} />
                  <MetricCard label="Funded" value={3} trend={{ direction: "flat", percentage: 0 }} />
                </div>

                <AIContent status="pending" onApprove={() => {}} onReject={() => {}}>
                  <p className="text-sm">
                    This is AI-generated content in a pending review state.
                  </p>
                </AIContent>

                <div className="grid gap-3">
                  <LoadingState variant="list" count={2} />
                </div>

                <EmptyState
                  icon={SparklesIcon}
                  title="Nothing here yet"
                  description="EmptyState primitive demo."
                  action={{ label: "Open DetailPanel", onClick: () => setDetailOpen(true) }}
                  secondaryAction={{ label: "Open ConfirmDialog", onClick: () => setConfirmOpen(true) }}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <DetailPanel
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="DetailPanel"
          subtitle="600px sheet with sticky header"
          badge={<StatusBadge status="active" label="Active" size="sm" />}
          tabs={[
            { label: "Overview", content: <p className="text-sm">Overview tab content.</p> },
            { label: "Activity", content: <p className="text-sm">Activity tab content.</p> },
          ]}
          actions={[{ label: "Action", onClick: () => {}, variant: "outline" }]}
        />

        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          title="ConfirmDialog"
          description="This is a destructive confirmation example."
          confirmLabel="Confirm"
          variant="destructive"
        />
      </div>
    </main>
  );
}
