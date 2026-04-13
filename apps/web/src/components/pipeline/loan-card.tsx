"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LoanCardProps {
  loan: any;
  onClick: () => void;
}

export function LoanCard({ loan, onClick }: LoanCardProps) {
  const contact = useQuery(
    api.contacts.queries.getById,
    loan.contactId ? { contactId: loan.contactId } : "skip"
  );

  const daysInStage = Math.floor(
    (Date.now() - loan.stageEnteredAt) / (1000 * 60 * 60 * 24)
  );

  const daysColor = daysInStage <= 3
    ? "text-muted-foreground"
    : daysInStage <= 7
      ? "text-status-warning"
      : "text-status-danger";

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {contact
              ? `${contact.firstName} ${contact.lastName}`
              : "Loading..."}
          </p>
          {loan.loanAmount && (
            <p className="text-sm text-muted-foreground">
              ${loan.loanAmount.toLocaleString()}
            </p>
          )}
        </div>
        <span className={cn("text-xs tabular-nums", daysColor)}>
          {daysInStage}d
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-xs">
          {loan.stage.replace(/_/g, " ")}
        </Badge>
        {loan.loanType && (
          <Badge variant="secondary" className="text-xs">
            {loan.loanType}
          </Badge>
        )}
      </div>
    </Card>
  );
}
