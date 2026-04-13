"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Columns3, Users } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(path: string) {
    router.push(path);
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => navigate("/today")}>
            <Calendar className="mr-2 h-4 w-4" />
            Go to Today
          </CommandItem>
          <CommandItem onSelect={() => navigate("/pipeline")}>
            <Columns3 className="mr-2 h-4 w-4" />
            Go to Pipeline
          </CommandItem>
          <CommandItem onSelect={() => navigate("/contacts")}>
            <Users className="mr-2 h-4 w-4" />
            Go to Contacts
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
