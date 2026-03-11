/**
 * @organ shell
 * @tissue hook/keyboard-shortcut
 * @description Registers a single global keyboard shortcut with safe defaults around focused inputs.
 * @depends-on
 *   - window keydown events
 * @depended-by
 *   - shell/shell-frame.tsx
 * @ai-notes
 *   - Keep input-guard behavior conservative so text fields stay usable.
 *   - `metaKey` treats Ctrl as equivalent so the shell works on non-macOS keyboards too.
 */

"use client";

import { useEffect, useRef } from "react";

type ShortcutOptions = {
  key: string;
  handler: () => void;
  allowInInputs?: boolean;
  altKey?: boolean;
  enabled?: boolean;
  metaKey?: boolean;
  preventDefault?: boolean;
  shiftKey?: boolean;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "select" || tagName === "textarea";
}

export function useKeyboardShortcut({
  key,
  handler,
  allowInInputs = false,
  altKey = false,
  enabled = true,
  metaKey = false,
  preventDefault = true,
  shiftKey = false,
}: ShortcutOptions) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      if (!allowInInputs && isEditableTarget(event.target)) {
        return;
      }

      const normalizedKey = key.toLowerCase();
      const eventKey = event.key.toLowerCase();
      const metaPressed = event.metaKey || event.ctrlKey;

      if (eventKey !== normalizedKey) {
        return;
      }

      if (Boolean(metaKey) !== metaPressed) {
        return;
      }

      if (Boolean(altKey) !== event.altKey) {
        return;
      }

      if (Boolean(shiftKey) !== event.shiftKey) {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }

      handlerRef.current();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [allowInInputs, altKey, enabled, key, metaKey, preventDefault, shiftKey]);
}
