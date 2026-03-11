/**
 * @organ core
 * @tissue hook/current-user
 * @description Boots the authenticated Clerk identity into Convex and returns the current app user record.
 * @depends-on
 *   - convex/core/mutations.ts (createOrGetUser)
 *   - convex/core/queries.ts (getCurrentUser)
 *   - Clerk user session state
 * @depended-by
 *   - shell/shell-frame.tsx
 * @ai-notes
 *   - This hook is the single client-side bootstrap path for the Phase 0.3 shell.
 *   - Never derive clerkId from the browser; the mutation already reads identity from Convex auth.
 */

"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";

function getPreferredEmail(user: ReturnType<typeof useUser>["user"]) {
  return user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? "";
}

function getPreferredName(user: ReturnType<typeof useUser>["user"]) {
  return (
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username?.trim() ||
    "LoanPilot User"
  );
}

export function useCurrentUser() {
  const { isLoaded, isSignedIn, user } = useUser();
  const currentUser = useQuery(api.core.queries.getCurrentUser, isSignedIn ? {} : "skip");
  const createOrGetUser = useMutation(api.core.mutations.createOrGetUser);

  const lastBootstrapUserIdRef = useRef<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      lastBootstrapUserIdRef.current = null;
      setBootstrapError(null);
      return;
    }

    if (!isSignedIn) {
      lastBootstrapUserIdRef.current = null;
      setBootstrapError(null);
      return;
    }

    if (currentUser === undefined) {
      return;
    }

    if (currentUser) {
      lastBootstrapUserIdRef.current = user.id;
      return;
    }

    if (lastBootstrapUserIdRef.current === user.id) {
      return;
    }

    const email = getPreferredEmail(user);
    const name = getPreferredName(user);

    if (!email) {
      setBootstrapError("The authenticated user does not have an email address yet.");
      return;
    }

    lastBootstrapUserIdRef.current = user.id;
    void (async () => {
      try {
        setBootstrapError(null);
        await createOrGetUser({ email, name });
      } catch (error) {
        lastBootstrapUserIdRef.current = null;
        setBootstrapError(
          error instanceof Error ? error.message : "Failed to create the current user in Convex.",
        );
      }
    })();
  }, [createOrGetUser, currentUser, isLoaded, isSignedIn, user]);

  const displayName = currentUser?.name ?? getPreferredName(user);
  const displayEmail = currentUser?.email ?? getPreferredEmail(user);

  const isBootstrapping =
    isSignedIn &&
    Boolean(
      currentUser === undefined ||
        (currentUser === null && user && lastBootstrapUserIdRef.current === user.id && !bootstrapError),
    );

  return {
    bootstrapError,
    currentUser,
    displayEmail,
    displayName,
    isBootstrapping,
    isLoaded,
    isSignedIn,
    user,
  };
}
