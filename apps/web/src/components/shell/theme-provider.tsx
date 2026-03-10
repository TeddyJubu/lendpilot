/**
 * @organ shell
 * @tissue providers
 * @description Client-side theme provider for dark/light mode.
 *   Uses next-themes with the class strategy (".dark") as specified in DESIGN_SYSTEM.md.
 * @depends-on
 *   - next-themes
 * @depended-by
 *   - src/app/layout.tsx (wraps the app so all components can read theme)
 * @ai-notes
 *   - Keep this as a thin wrapper so layout.tsx stays a Server Component.
 */

"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
