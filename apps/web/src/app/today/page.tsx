"use client";

import { FeedList } from "@/components/today/feed-list";

export default function TodayPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Today</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Your prioritized action feed. Complete, snooze, or dismiss items as you go.
      </p>
      <FeedList />
    </div>
  );
}
