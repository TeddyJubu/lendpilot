"use client";

import { useState } from "react";
import { usePipeline } from "@/hooks/usePipeline";
import { StageColumn } from "./stage-column";
import { LoanDetail } from "./loan-detail";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Columns3 } from "lucide-react";
import type { StageGroup } from "../../../convex/types";

const VISIBLE_GROUPS: StageGroup[] = ["intake", "qualification", "processing", "closing"];

export function KanbanBoard() {
  const { grouped, isLoading, totalActive } = usePipeline();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;

  if (totalActive === 0) {
    return (
      <EmptyState
        icon={Columns3}
        title="No loans in pipeline"
        description="Create a loan from a contact's profile to see it here."
      />
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {VISIBLE_GROUPS.map((group) => (
          <StageColumn
            key={group}
            group={group}
            loans={grouped[group]}
            onLoanClick={setSelectedLoanId}
          />
        ))}
      </div>

      <LoanDetail
        loanId={selectedLoanId}
        open={!!selectedLoanId}
        onClose={() => setSelectedLoanId(null)}
      />
    </>
  );
}
