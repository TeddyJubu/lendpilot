/**
 * @organ shell
 * @tissue frame
 * @description Assembles the protected app shell, including sidebar, command bar, copilot, and global shortcuts.
 * @depends-on
 *   - shell/app-sidebar.tsx
 *   - shell/command-bar.tsx
 *   - shell/copilot-panel.tsx
 *   - hooks/use-current-user.ts
 *   - hooks/use-keyboard-shortcut.ts
 * @depended-by
 *   - app/(shell)/layout.tsx
 */

"use client";

import { startTransition, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { CommandBar } from "@/components/shell/command-bar";
import { CopilotPanel } from "@/components/shell/copilot-panel";
import { ShortcutHelp } from "@/components/shell/shortcut-help";
import { TopBar } from "@/components/shell/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const viewMetadata = [
  { href: "/today", title: "Today" },
  { href: "/pipeline", title: "Pipeline" },
  { href: "/contacts", title: "Contacts" },
  { href: "/settings", title: "Settings" },
] as const;

function getViewTitle(pathname: string) {
  return viewMetadata.find((view) => pathname.startsWith(view.href))?.title ?? "LoanPilot";
}

export function ShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { bootstrapError, displayEmail, displayName, isBootstrapping } = useCurrentUser();

  const [commandOpen, setCommandOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const currentViewTitle = getViewTitle(pathname);

  const goTo = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  useKeyboardShortcut({
    handler: () => setCommandOpen(true),
    key: "k",
    metaKey: true,
  });

  useKeyboardShortcut({
    handler: () => setCopilotOpen((current) => !current),
    key: "/",
    metaKey: true,
  });

  useKeyboardShortcut({
    handler: () => goTo("/today"),
    key: "1",
  });

  useKeyboardShortcut({
    handler: () => goTo("/pipeline"),
    key: "2",
  });

  useKeyboardShortcut({
    handler: () => goTo("/contacts"),
    key: "3",
  });

  useKeyboardShortcut({
    handler: () => setShortcutHelpOpen(true),
    key: "?",
    shiftKey: true,
  });

  useKeyboardShortcut({
    allowInInputs: true,
    handler: () => {
      if (commandOpen) {
        setCommandOpen(false);
        return;
      }

      if (shortcutHelpOpen) {
        setShortcutHelpOpen(false);
        return;
      }

      if (copilotOpen) {
        setCopilotOpen(false);
      }
    },
    key: "escape",
  });

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar pathname={pathname} />
      <SidebarInset className="min-h-svh">
        <TopBar
          onOpenCommandBar={() => setCommandOpen(true)}
          onOpenShortcuts={() => setShortcutHelpOpen(true)}
          onToggleCopilot={() => setCopilotOpen((current) => !current)}
          subtitle={displayEmail || displayName}
          title={currentViewTitle}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            {isBootstrapping ? (
              <div className="border-b border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground lg:px-6">
                Syncing your authenticated broker profile into Convex…
              </div>
            ) : null}

            {bootstrapError ? (
              <div className="border-b border-status-danger/20 bg-status-danger-muted px-4 py-3 text-sm text-status-danger lg:px-6">
                Current-user bootstrap could not complete: {bootstrapError}
              </div>
            ) : null}

            <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">{children}</main>
          </div>

          <CopilotPanel
            contextLabel={currentViewTitle}
            onOpenChange={setCopilotOpen}
            open={copilotOpen}
          />
        </div>
      </SidebarInset>

      <CommandBar onOpenChange={setCommandOpen} open={commandOpen} pathname={pathname} />
      <ShortcutHelp onOpenChange={setShortcutHelpOpen} open={shortcutHelpOpen} />
    </SidebarProvider>
  );
}
