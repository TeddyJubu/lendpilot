"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, Upload } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  requested: { label: "Requested", variant: "outline" },
  uploaded: { label: "Uploaded", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "destructive" },
};

interface DocListProps {
  loanId: string;
}

export function DocList({ loanId }: DocListProps) {
  const docs = useQuery(api.documents.queries.listByLoan, { loanId });
  const markUploaded = useMutation(api.documents.mutations.markUploaded);

  async function handleMarkUploaded(documentId: string) {
    try {
      await markUploaded({ documentId });
      toast.success("Document marked as uploaded");
    } catch {
      toast.error("Failed to update document");
    }
  }

  if (!docs) return null;
  if (docs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No documents requested yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((doc: any) => {
        const config = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.requested;
        const isOverdue = doc.dueDate && doc.dueDate < Date.now() && doc.status === "requested";

        return (
          <div
            key={doc._id}
            className="flex items-center justify-between rounded-md border p-2 text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              {doc.status === "approved" ? (
                <Check className="h-4 w-4 text-status-success shrink-0" />
              ) : doc.status === "requested" ? (
                <Clock className={`h-4 w-4 shrink-0 ${isOverdue ? "text-status-danger" : "text-muted-foreground"}`} />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{doc.name}</span>
              <Badge variant="secondary" className="text-xs shrink-0">
                {doc.category}
              </Badge>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={config.variant}>{config.label}</Badge>
              {doc.status === "requested" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkUploaded(doc._id)}
                >
                  Mark Uploaded
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
