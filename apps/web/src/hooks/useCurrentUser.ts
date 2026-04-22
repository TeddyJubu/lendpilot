"use client";

import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

/**
 * Hook that returns the current user from Convex.
 * Automatically creates a user record on first sign-in.
 */
export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const convexUser = useQuery(api.core.queries.getCurrentUser);
  const createOrGetUser = useMutation(api.core.mutations.createOrGetUser);

  useEffect(() => {
    if (isClerkLoaded && clerkUser && convexUser === null) {
      createOrGetUser({
        name: clerkUser.fullName ?? clerkUser.firstName ?? undefined,
      });
    }
  }, [isClerkLoaded, clerkUser, convexUser, createOrGetUser]);

  return {
    user: convexUser,
    isLoading: convexUser === undefined,
    isAuthenticated: !!convexUser,
  };
}
