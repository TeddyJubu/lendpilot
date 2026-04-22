"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FeedCard } from "./feed-card";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Calendar } from "lucide-react";

export function FeedList() {
  const feedItems = useQuery(api.feed.queries.listActive);

  if (feedItems === undefined) return <LoadingState />;

  if (feedItems.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="All caught up"
        description="No action items right now. Feed items will appear when documents are overdue, loans are stale, or contacts need follow-up."
      />
    );
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item: any) => (
        <FeedCard key={item._id} item={item} />
      ))}
    </div>
  );
}
