"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { LoanForm } from "@/components/pipeline/loan-form";

export default function PipelinePage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Loan
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>

      <LoanForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
