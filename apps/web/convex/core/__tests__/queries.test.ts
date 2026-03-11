// @vitest-environment node

/**
 * @organ core
 * @tissue queries.test
 * @description Tests for core user bootstrap queries.
 */

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";

describe("core/queries.getCurrentUser", () => {
  test("returns null when unauthenticated", async () => {
    const t = convexTest(schema);
    const user = await t.query(api.core.queries.getCurrentUser);
    expect(user).toBeNull();
  });

  test("returns null when authenticated but user row not created yet", async () => {
    const t = convexTest(schema).withIdentity({ subject: "user_missing" });
    const user = await t.query(api.core.queries.getCurrentUser);
    expect(user).toBeNull();
  });

  test("returns the user after createOrGetUser", async () => {
    const t = convexTest(schema).withIdentity({ subject: "user_4" });

    await t.mutation(api.core.mutations.createOrGetUser, {
      email: "b@example.com",
      name: "Babbage",
    });

    const user = await t.query(api.core.queries.getCurrentUser);
    expect(user?.clerkId).toEqual("user_4");
    expect(user?.email).toEqual("b@example.com");
    expect(user?.name).toEqual("Babbage");
  });
});
