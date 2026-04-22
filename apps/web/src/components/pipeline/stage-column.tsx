"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { LoanCard } from "./loan-card";
import type { StageGroup } from "../../../convex/types";

const GROUP_COLORS: Record<StageGroup, string> = {
  intake: "bg-stage-intake",
  qualification: "bg-stage-qualification",
  processing: "bg-stage-processing",
  closing: "bg-stage-closing",
  terminal: "bg-stage-terminal-fail",
};

const GROUP_LABELS: Record<StageGroup, string> = {
  intake: "Intake",
  qualification: "Qualification",
  processing: "Processing",
  closing: "Closing",
  terminal: "Terminal",
};

interface StageColumnProps {
  group: StageGroup;
  loans: any[];
  onLoanClick: (loanId: string) => void;
}

export function StageColumn({ group, loans, onLoanClick }: StageColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px]">
      <div className="flex items-center gap-2 px-2 py-3">
        <div className={`h-2 w-2 rounded-full ${GROUP_COLORS[group]}`} />
        <h3 className="text-sm font-semibold">{GROUP_LABELS[group]}</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {loans.length}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 px-1 pb-4">
          {loans.map((loan: any) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              onClick={() => onLoanClick(loan._id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
