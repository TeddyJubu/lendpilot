"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "border-l-4 border-l-priority-urgent",
  high: "border-l-4 border-l-priority-high",
  medium: "border-l-4 border-l-priority-medium",
  low: "border-l-4 border-l-priority-low",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface FeedCardProps {
  item: any;
}

export function FeedCard({ item }: FeedCardProps) {
  const completeFeedItem = useMutation(api.feed.mutations.complete);
  const dismissFeedItem = useMutation(api.feed.mutations.dismiss);
  const snoozeFeedItem = useMutation(api.feed.mutations.snooze);

  async function handleComplete() {
    try {
      await completeFeedItem({ feedItemId: item._id });
      toast.success("Marked as done");
    } catch {
      toast.error("Failed to complete");
    }
  }

  async function handleDismiss() {
    try {
      await dismissFeedItem({ feedItemId: item._id });
    } catch {
      toast.error("Failed to dismiss");
    }
  }

  async function handleSnooze() {
    try {
      await snoozeFeedItem({
        feedItemId: item._id,
        snoozeDurationMs: 24 * 60 * 60 * 1000, // 24 hours
      });
      toast.success("Snoozed for 24 hours");
    } catch {
      toast.error("Failed to snooze");
    }
  }

  return (
    <Card className={cn("p-4", PRIORITY_STYLES[item.priority])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{item.title}</h3>
            <Badge variant="outline" className="text-xs shrink-0">
              {PRIORITY_LABELS[item.priority] ?? item.priority}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          {item.reasoning && (
            <p className="text-xs text-muted-foreground/70 mt-1 italic">
              {item.reasoning}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComplete}
            aria-label="Mark as done"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSnooze}
            aria-label="Snooze 24 hours"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <Button variant="outline" size="sm">
          {item.suggestedAction}
        </Button>
      </div>
    </Card>
  );
}
