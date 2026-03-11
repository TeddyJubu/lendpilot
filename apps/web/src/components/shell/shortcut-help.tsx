/**
 * @organ shell
 * @tissue shortcut-help
 * @description Compact keyboard shortcut reference dialog for the shell skeleton.
 * @depends-on
 *   - components/ui/dialog.tsx
 * @depended-by
 *   - shell/shell-frame.tsx
 */

"use client";

import { KeyboardShortcut } from "@/components/primitives/keyboard-shortcut";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const shortcuts = [
  { label: "Open command bar", keys: ["Cmd", "K"] },
  { label: "Toggle copilot", keys: ["Cmd", "/"] },
  { label: "Collapse sidebar", keys: ["Cmd", "B"] },
  { label: "Go to Today", keys: ["1"] },
  { label: "Go to Pipeline", keys: ["2"] },
  { label: "Go to Contacts", keys: ["3"] },
  { label: "Close active panel", keys: ["Esc"] },
  { label: "Open this help", keys: ["?"] },
] as const;

type ShortcutHelpProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShortcutHelp({ open, onOpenChange }: ShortcutHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            The Phase 0.3 shell is built to stay usable without touching the mouse.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.label}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
            >
              <span className="text-sm text-muted-foreground">{shortcut.label}</span>
              <KeyboardShortcut keys={[...shortcut.keys]} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
