"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LoanFormProps {
  open: boolean;
  onClose: () => void;
}

export function LoanForm({ open, onClose }: LoanFormProps) {
  const contacts = useQuery(api.contacts.queries.listForSelect);
  const createLoan = useMutation(api.loans.mutations.create);
  const [loading, setLoading] = useState(false);

  const [contactId, setContactId] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [loanType, setLoanType] = useState("");
  const [fico, setFico] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId) {
      toast.error("Select a contact");
      return;
    }

    setLoading(true);
    try {
      await createLoan({
        contactId,
        loanAmount: loanAmount ? Number(loanAmount) : undefined,
        propertyAddress: propertyAddress || undefined,
        loanType: loanType ? (loanType as any) : undefined,
        fico: fico ? Number(fico) : undefined,
      });
      toast.success("Loan created");
      resetForm();
      onClose();
    } catch {
      toast.error("Failed to create loan");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setContactId("");
    setLoanAmount("");
    setPropertyAddress("");
    setLoanType("");
    setFico("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Borrower *</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact..." />
              </SelectTrigger>
              <SelectContent>
                {(contacts ?? []).map((c: any) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Loan Amount</Label>
            <Input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="350000"
            />
          </div>

          <div className="space-y-2">
            <Label>Property Address</Label>
            <Input
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="123 Main St, City, ST"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Loan Type</Label>
              <Select value={loanType} onValueChange={setLoanType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conventional">Conventional</SelectItem>
                  <SelectItem value="FHA">FHA</SelectItem>
                  <SelectItem value="VA">VA</SelectItem>
                  <SelectItem value="USDA">USDA</SelectItem>
                  <SelectItem value="Jumbo">Jumbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>FICO</Label>
              <Input
                type="number"
                value={fico}
                onChange={(e) => setFico(e.target.value)}
                placeholder="740"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
