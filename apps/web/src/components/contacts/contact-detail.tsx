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
import { Archive, Mail, Phone } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  lead: "Lead",
  borrower: "Borrower",
  referral_partner: "Referral Partner",
  realtor: "Realtor",
  other: "Other",
};

const ACTIVITY_ICONS: Record<string, string> = {
  system: "System",
  stage_change: "Stage Change",
  note: "Note",
  email_sent: "Email Sent",
  doc_requested: "Doc Requested",
  doc_uploaded: "Doc Uploaded",
};

interface ContactDetailProps {
  contactId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ContactDetail({ contactId, open, onClose }: ContactDetailProps) {
  const contact = useQuery(
    api.contacts.queries.getById,
    contactId ? { contactId } : "skip"
  );

  const activities = useQuery(
    api.activities.queries.listByContact,
    contactId ? { contactId, limit: 20 } : "skip"
  );

  const loans = useQuery(
    api.loans.queries.listByContact,
    contactId ? { contactId } : "skip"
  );

  const archiveContact = useMutation(api.contacts.mutations.archive);

  async function handleArchive() {
    if (!contactId) return;
    try {
      await archiveContact({ contactId });
      toast.success("Contact archived");
      onClose();
    } catch {
      toast.error("Failed to archive contact");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        {!contact ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                {contact.firstName} {contact.lastName}
                <Badge variant="secondary">
                  {TYPE_LABELS[contact.type] ?? contact.type}
                </Badge>
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-2 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {contact.email}
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {contact.phone}
                </div>
              )}
              {contact.notes && (
                <p className="mt-2 text-muted-foreground">{contact.notes}</p>
              )}
            </div>

            <Separator className="my-4" />

            {/* Linked Loans */}
            {loans && loans.length > 0 && (
              <>
                <h3 className="font-semibold text-sm mb-2">Loans ({loans.length})</h3>
                <div className="space-y-2 mb-4">
                  {loans.map((loan: any) => (
                    <div key={loan._id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <span>
                        {loan.loanAmount
                          ? `$${loan.loanAmount.toLocaleString()}`
                          : "Amount TBD"}
                      </span>
                      <Badge variant="outline">{loan.stage?.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
              </>
            )}

            {/* Activity Timeline */}
            <h3 className="font-semibold text-sm mb-2">Activity</h3>
            {activities === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity: any) => (
                  <div key={activity._id} className="text-sm border-l-2 border-border pl-3 py-1">
                    <div className="font-medium">
                      {activity.subject ?? ACTIVITY_ICONS[activity.type] ?? activity.type}
                    </div>
                    {activity.body && (
                      <p className="text-muted-foreground text-xs mt-0.5">{activity.body}</p>
                    )}
                    <time className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </time>
                  </div>
                ))}
              </div>
            )}

            <Separator className="my-4" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              className="text-destructive"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Contact
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
