"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactList } from "@/components/contacts/contact-list";
import { ContactForm } from "@/components/contacts/contact-form";

export default function ContactsPage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <ContactList />
      <ContactForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
