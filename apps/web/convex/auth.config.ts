/**
 * @organ core
 * @tissue auth-config
 * @description Configures Convex to trust Clerk-issued JWTs for the LoanPilot app.
 *   This is the server-side half of the Clerk ↔ Convex auth bridge used by Phase 0 shell bootstrap.
 * @depends-on
 *   - Clerk JWT template named `convex`
 *   - Convex deployment env: `CLERK_FRONTEND_API_URL` or `CLERK_JWT_ISSUER_DOMAIN`
 * @depended-by
 *   - convex/core/queries.ts
 *   - convex/core/mutations.ts
 *   - src/components/shell/app-providers.tsx
 * @ai-notes
 *   - `applicationID` must stay `convex` to match `ConvexProviderWithClerk`.
 *   - The issuer domain must be the Clerk Frontend API URL / JWT issuer URL, including `https://`.
 */

import type { AuthConfig } from "convex/server";

const clerkIssuerDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ?? process.env.CLERK_FRONTEND_API_URL;

export default {
  providers: [
    {
      domain: clerkIssuerDomain!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
