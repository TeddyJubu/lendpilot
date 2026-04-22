"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getNextStages } from "../../../convex/loans/stateMachine";
import type { LoanStage } from "../../../convex/types";

interface LoanDetailProps {
  loanId: string | null;
  open: boolean;
  onClose: () => void;
}

export function LoanDetail({ loanId, open, onClose }: LoanDetailProps) {
  const loan = useQuery(
    api.loans.queries.getById,
    loanId ? { loanId } : "skip"
  );

  const contact = useQuery(
    api.contacts.queries.getById,
    loan?.contactId ? { contactId: loan.contactId } : "skip"
  );

  const activities = useQuery(
    api.activities.queries.listByLoan,
    loanId ? { loanId, limit: 15 } : "skip"
  );

  const updateStage = useMutation(api.loans.mutations.updateStage);

  async function handleStageChange(newStage: LoanStage) {
    if (!loanId) return;
    try {
      await updateStage({ loanId, stage: newStage });
      toast.success(`Stage updated to ${newStage.replace(/_/g, " ")}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update stage");
    }
  }

  const nextStages = loan ? getNextStages(loan.stage as LoanStage) : [];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        {!loan ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>
                {contact
                  ? `${contact.firstName} ${contact.lastName}`
                  : "Loading..."}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {loan.stage.replace(/_/g, " ")}
                </Badge>
                {loan.loanType && (
                  <Badge variant="secondary">{loan.loanType}</Badge>
                )}
              </div>

              {loan.loanAmount && (
                <p className="text-lg font-semibold">
                  ${loan.loanAmount.toLocaleString()}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                {loan.propertyAddress && (
                  <div>
                    <span className="text-muted-foreground">Property:</span>{" "}
                    {loan.propertyAddress}
                  </div>
                )}
                {loan.fico && (
                  <div>
                    <span className="text-muted-foreground">FICO:</span> {loan.fico}
                  </div>
                )}
                {loan.ltv && (
                  <div>
                    <span className="text-muted-foreground">LTV:</span> {loan.ltv}%
                  </div>
                )}
                {loan.lockedRate && (
                  <div>
                    <span className="text-muted-foreground">Rate:</span>{" "}
                    {loan.lockedRate}%
                  </div>
                )}
              </div>
            </div>

            {/* Stage Transitions */}
            {nextStages.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="font-semibold text-sm mb-2">Move to Stage</h3>
                <div className="flex flex-wrap gap-2">
                  {nextStages.map((stage) => (
                    <Button
                      key={stage}
                      variant="outline"
                      size="sm"
                      onClick={() => handleStageChange(stage)}
                    >
                      {stage.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              </>
            )}

            {/* Stage History */}
            {loan.stageHistory && loan.stageHistory.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="font-semibold text-sm mb-2">Stage History</h3>
                <div className="space-y-2">
                  {[...loan.stageHistory].reverse().map((entry: any, i: number) => (
                    <div key={i} className="text-sm border-l-2 border-border pl-3 py-1">
                      <span className="font-medium">
                        {entry.stage.replace(/_/g, " ")}
                      </span>
                      <time className="text-xs text-muted-foreground ml-2">
                        {new Date(entry.enteredAt).toLocaleDateString()}
                      </time>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Activity */}
            <Separator className="my-4" />
            <h3 className="font-semibold text-sm mb-2">Activity</h3>
            {activities === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {activities.map((a: any) => (
                  <div key={a._id} className="text-sm border-l-2 border-border pl-3 py-1">
                    <span className="font-medium">{a.subject ?? a.type}</span>
                    {a.body && (
                      <p className="text-xs text-muted-foreground">{a.body}</p>
                    )}
                    <time className="text-xs text-muted-foreground">
                      {new Date(a.timestamp).toLocaleDateString()}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
