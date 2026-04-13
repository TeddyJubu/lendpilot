"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { LoanStage, StageGroup } from "../../convex/types";
import { STAGE_GROUPS } from "../../convex/types";

/**
 * Hook that returns loans grouped by stage group for the kanban board.
 */
export function usePipeline() {
  const loans = useQuery(api.loans.queries.listForPipeline);

  const grouped: Record<StageGroup, any[]> = {
    intake: [],
    qualification: [],
    processing: [],
    closing: [],
    terminal: [],
  };

  if (loans) {
    for (const loan of loans) {
      for (const [group, stages] of Object.entries(STAGE_GROUPS)) {
        if ((stages as readonly string[]).includes(loan.stage)) {
          grouped[group as StageGroup].push(loan);
          break;
        }
      }
    }
  }

  return {
    loans,
    grouped,
    isLoading: loans === undefined,
    totalActive: loans?.filter((l: any) =>
      l.stage !== "funded" && l.stage !== "withdrawn" && l.stage !== "denied"
    ).length ?? 0,
  };
}
