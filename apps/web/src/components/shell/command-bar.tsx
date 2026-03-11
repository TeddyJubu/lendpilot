/**
 * @organ shell
 * @tissue command-bar
 * @description Keyboard-first command surface for navigation and future create/search flows.
 * @depends-on
 *   - components/ui/command.tsx
 *   - Next router
 * @depended-by
 *   - shell/shell-frame.tsx
 */

"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FilePlus2Icon,
  LayoutListIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react";
import { toast } from "sonner";

import { KeyboardShortcut } from "@/components/primitives/keyboard-shortcut";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NavigationItem = {
  href: string;
  icon: typeof LayoutListIcon;
  label: string;
  shortcut?: string[];
};

const navigationItems: NavigationItem[] = [
  { href: "/today", icon: LayoutListIcon, label: "Go to Today", shortcut: ["1"] },
  { href: "/pipeline", icon: WorkflowIcon, label: "Go to Pipeline", shortcut: ["2"] },
  { href: "/contacts", icon: UsersIcon, label: "Go to Contacts", shortcut: ["3"] },
  { href: "/settings", icon: Settings2Icon, label: "Open Settings" },
];

const createItems = [
  { label: "New lead", description: "Lead capture lands in Contacts during Phase 1." },
  { label: "New loan", description: "Loan creation lands in Pipeline during Phase 2." },
  { label: "New contact", description: "Contact creation lands in Phase 1." },
] as const;

type CommandBarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
};

function getRecentItems(pathname: string) {
  if (pathname.startsWith("/pipeline")) {
    return [
      { label: "Review pipeline empty state", href: "/pipeline", icon: WorkflowIcon },
      { label: "Jump to Today priorities", href: "/today", icon: LayoutListIcon },
    ];
  }

  if (pathname.startsWith("/contacts")) {
    return [
      { label: "Review contacts empty state", href: "/contacts", icon: UsersIcon },
      { label: "Open Today priorities", href: "/today", icon: LayoutListIcon },
    ];
  }

  return [
    { label: "Open Today priorities", href: "/today", icon: LayoutListIcon },
    { label: "Open shell settings", href: "/settings", icon: Settings2Icon },
  ];
}

export function CommandBar({ open, onOpenChange, pathname }: CommandBarProps) {
  const router = useRouter();
  const recentItems = getRecentItems(pathname);

  const navigateTo = (href: string) => {
    onOpenChange(false);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[560px] border border-border bg-card/95 p-0 shadow-2xl supports-backdrop-filter:backdrop-blur"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>LoanPilot Command Bar</DialogTitle>
          <DialogDescription>Search for a route or shell action.</DialogDescription>
        </DialogHeader>

        <Command>
        <CommandInput placeholder="Search or type a command..." />
        <CommandList>
          <CommandEmpty>No matching shell actions yet.</CommandEmpty>

          <CommandGroup heading="Recent">
            {recentItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.label} onSelect={() => navigateTo(item.href)}>
                  <Icon />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigate">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.href} onSelect={() => navigateTo(item.href)}>
                  <Icon />
                  <span>{item.label}</span>
                  {item.shortcut ? (
                    <CommandShortcut>
                      <KeyboardShortcut keys={item.shortcut} />
                    </CommandShortcut>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Create">
            {createItems.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => {
                  onOpenChange(false);
                  toast.info(item.description);
                }}
              >
                <FilePlus2Icon />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Search">
            <CommandItem
              onSelect={() => {
                onOpenChange(false);
                toast.message("Search will connect once Contacts and Loans are implemented.");
              }}
            >
              <SearchIcon />
              <span>Search contacts and loans</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                onOpenChange(false);
                toast.message("Copilot drafting arrives in Phase 6.");
              }}
            >
              <SparklesIcon />
              <span>Ask Copilot to draft the next step</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
