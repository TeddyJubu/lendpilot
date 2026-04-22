"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import { ContactDetail } from "./contact-detail";

const TYPE_LABELS: Record<string, string> = {
  lead: "Lead",
  borrower: "Borrower",
  referral_partner: "Referral Partner",
  realtor: "Realtor",
  other: "Other",
};

export function ContactList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const contacts = useQuery(api.contacts.queries.list, {
    paginationOpts: { numItems: 50, cursor: null },
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  const searchResults = useQuery(
    api.contacts.queries.search,
    searchQuery.length > 0
      ? { query: searchQuery, type: typeFilter !== "all" ? typeFilter : undefined }
      : "skip"
  );

  const displayContacts = searchQuery.length > 0
    ? searchResults ?? []
    : contacts?.page ?? [];

  if (contacts === undefined) return <LoadingState />;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="borrower">Borrower</SelectItem>
            <SelectItem value="referral_partner">Referral Partner</SelectItem>
            <SelectItem value="realtor">Realtor</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {displayContacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to get started with your pipeline."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayContacts.map((contact: any) => (
              <TableRow
                key={contact._id}
                className="cursor-pointer"
                onClick={() => setSelectedContactId(contact._id)}
              >
                <TableCell className="font-medium">
                  {contact.firstName} {contact.lastName}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {TYPE_LABELS[contact.type] ?? contact.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.email ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.phone ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ContactDetail
        contactId={selectedContactId}
        open={!!selectedContactId}
        onClose={() => setSelectedContactId(null)}
      />
    </>
  );
}
