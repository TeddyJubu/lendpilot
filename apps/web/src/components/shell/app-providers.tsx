/**
 * @organ shell
 * @tissue providers
 * @description Shared app providers for Clerk auth, Convex auth bridging, theming, and UI overlays.
 * @depends-on
 *   - @clerk/nextjs (auth context)
 *   - convex/react-clerk (Convex auth bridge)
 *   - components/shell/theme-provider.tsx
 * @depended-by
 *   - src/app/layout.tsx
 * @ai-notes
 *   - Keep the Convex client singleton outside the component tree.
 *   - Use a harmless placeholder URL during build-only environments so verification commands still run.
 */

"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

import { ThemeProvider } from "@/components/shell/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud",
);

function ConvexClerkBridge({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClerkBridge>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </ConvexClerkBridge>
    </ClerkProvider>
  );
}
