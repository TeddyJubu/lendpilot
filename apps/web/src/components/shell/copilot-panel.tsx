/**
 * @organ copilot
 * @tissue panel
 * @description Skeleton right-side Copilot panel for the Phase 0.3 shell.
 * @depends-on
 *   - components/primitives/ai-content.tsx
 *   - components/ui/sheet.tsx
 * @depended-by
 *   - shell/shell-frame.tsx
 * @ai-notes
 *   - This is intentionally a shell-only mock. Real AI calls arrive in Phase 6.
 */

"use client";

import { useMemo, useState } from "react";
import { BotIcon, SendHorizonalIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AIContent } from "@/components/primitives/ai-content";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type CopilotPanelProps = {
  contextLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getSuggestionChips(contextLabel: string) {
  if (contextLabel === "Pipeline") {
    return [
      "Summarize what should happen next in this pipeline.",
      "Draft a follow-up note for a borrower stuck in docs.",
      "Explain what a high-priority loan update should look like.",
    ];
  }

  if (contextLabel === "Contacts") {
    return [
      "Write a warm first outreach for a new lead.",
      "Suggest the next relationship-building action.",
      "Summarize how AI enrichment will appear here later.",
    ];
  }

  return [
    "Summarize today’s highest-leverage actions.",
    "Draft a quick broker check-in message.",
    "Explain how Cmd+K and Copilot work together.",
  ];
}

function CopilotPanelBody({
  contextLabel,
  onOpenChange,
}: Pick<CopilotPanelProps, "contextLabel" | "onOpenChange">) {
  const [draft, setDraft] = useState("");
  const suggestionChips = useMemo(() => getSuggestionChips(contextLabel), [contextLabel]);

  const sendDraft = () => {
    if (!draft.trim()) {
      return;
    }

    toast.message("Copilot responses are scaffolded now and will be connected in Phase 6.");
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
              <BotIcon className="size-4" />
              Copilot
            </h2>
            <p className="text-sm text-muted-foreground">Viewing: {contextLabel}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Collapse
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <AIContent status="approved">
          <div className="space-y-2 text-sm leading-6">
            <p>
              The shell is wired for real authenticated context now. When the AI gateway lands,
              this panel will draft updates, explain priority, and keep the broker in control.
            </p>
            <p className="text-muted-foreground">
              Right now you can use the panel as a scaffold for prompts, layout, and shortcut flow.
            </p>
          </div>
        </AIContent>

        <div className="ml-auto max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm text-foreground">
          What should the Copilot help me do first on {contextLabel.toLowerCase()}?
        </div>

        <div className="max-w-[90%] rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          Start with the highest-confidence shell action: navigate, stage the next workflow, and
          capture any missing context so the future AI lane has a clean surface to plug into.
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestionChips.map((chip) => (
            <Button
              key={chip}
              size="xs"
              variant="outline"
              onClick={() => setDraft(chip)}
            >
              <SparklesIcon />
              {chip}
            </Button>
          ))}
        </div>

        <Textarea
          className="min-h-28 resize-none"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              sendDraft();
            }
          }}
          placeholder="Ask Copilot for guidance. Cmd+Enter will submit once Phase 6 wiring lands."
          value={draft}
        />

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Cmd+Enter sends your draft.</p>
          <Button onClick={sendDraft} size="sm">
            Send
            <SendHorizonalIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CopilotPanel({ contextLabel, open, onOpenChange }: CopilotPanelProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden border-l border-border bg-card transition-[width] duration-200 ease-out xl:flex",
          open ? "w-[360px]" : "w-0 border-l-transparent",
        )}
      >
        {open ? (
          <div className="h-full min-w-[360px]">
            <CopilotPanelBody contextLabel={contextLabel} onOpenChange={onOpenChange} />
          </div>
        ) : null}
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-[360px] p-0 xl:hidden" side="right">
          <SheetHeader className="sr-only">
            <SheetTitle>Copilot panel</SheetTitle>
            <SheetDescription>
              Review contextual AI guidance and draft the next shell action.
            </SheetDescription>
          </SheetHeader>
          <CopilotPanelBody contextLabel={contextLabel} onOpenChange={onOpenChange} />
        </SheetContent>
      </Sheet>
    </>
  );
}
