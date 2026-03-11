/**
 * @organ shell
 * @tissue theme-toggle
 * @description Small light/dark mode toggle used in the Phase 0.3 shell.
 * @depends-on
 *   - next-themes
 * @depended-by
 *   - shell/app-sidebar.tsx
 *   - shell/top-bar.tsx
 */

"use client";

import { MoonStarIcon, SunMediumIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      className={cn("justify-start", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunMediumIcon /> : <MoonStarIcon />}
      {showLabel ? <span>{isDark ? "Light mode" : "Dark mode"}</span> : null}
    </Button>
  );
}
