/**
 * @organ shell
 * @tissue top-bar
 * @description Compact responsive header for the protected shell.
 * @depends-on
 *   - components/ui/sidebar.tsx
 *   - shell/theme-toggle.tsx
 * @depended-by
 *   - shell/shell-frame.tsx
 */

"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { BotIcon, CircleHelpIcon, SearchIcon } from "lucide-react";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { KeyboardShortcut } from "@/components/primitives/keyboard-shortcut";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

type TopBarProps = {
  subtitle?: string;
  title: string;
  onOpenCommandBar: () => void;
  onOpenShortcuts: () => void;
  onToggleCopilot: () => void;
};

export function TopBar({
  subtitle,
  title,
  onOpenCommandBar,
  onOpenShortcuts,
  onToggleCopilot,
}: TopBarProps) {
  const { isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 supports-backdrop-filter:backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm" onClick={onOpenCommandBar}>
            <SearchIcon />
            Command bar
            <KeyboardShortcut keys={["Cmd", "K"]} />
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleCopilot}>
            <BotIcon />
            Copilot
            <KeyboardShortcut keys={["Cmd", "/"]} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onOpenShortcuts}>
            <CircleHelpIcon />
            <span className="sr-only">Open keyboard shortcuts</span>
          </Button>
          <ThemeToggle />
          {isSignedIn ? <UserButton /> : null}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="icon-sm" onClick={onOpenCommandBar}>
            <SearchIcon />
            <span className="sr-only">Open command bar</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onToggleCopilot}>
            <BotIcon />
            <span className="sr-only">Toggle copilot</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
