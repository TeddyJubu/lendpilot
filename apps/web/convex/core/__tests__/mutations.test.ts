// @vitest-environment edge-runtime

/**
 * @organ core
 * @tissue mutations.test
 * @description Tests for core user bootstrap mutations.
 */

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";
import { convexModules } from "../../test.setup";

describe("core/mutations.createOrGetUser", () => {
  test("creates a user row for the authenticated identity", async () => {
    const t = convexTest(schema, convexModules).withIdentity({ subject: "user_1" });

    const userId = await t.mutation(api.core.mutations.createOrGetUser, {
      email: "a@example.com",
      name: "Ada Lovelace",
    });

    const current = await t.query(api.core.queries.getCurrentUser);
    expect(current).not.toBeNull();
    expect(current?._id).toEqual(userId);
    expect(current?.clerkId).toEqual("user_1");
    expect(current?.email).toEqual("a@example.com");
    expect(current?.name).toEqual("Ada Lovelace");
    expect(current?.tier).toEqual("trial");
  });

  test("is idempotent (second call patches the existing row)", async () => {
    const t = convexTest(schema, convexModules).withIdentity({ subject: "user_2" });

    const firstId = await t.mutation(api.core.mutations.createOrGetUser, {
      email: "first@example.com",
      name: "First Name",
    });
    const secondId = await t.mutation(api.core.mutations.createOrGetUser, {
      email: "second@example.com",
      name: "Second Name",
    });

    expect(secondId).toEqual(firstId);

    const current = await t.query(api.core.queries.getCurrentUser);
    expect(current?.email).toEqual("second@example.com");
    expect(current?.name).toEqual("Second Name");
  });

  test("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, convexModules);

    await expect(
      t.mutation(api.core.mutations.createOrGetUser, {
        email: "a@example.com",
        name: "Ada",
      })
    ).rejects.toThrow(/Not authenticated/i);
  });

  test("rejects empty email/name", async () => {
    const t = convexTest(schema, convexModules).withIdentity({ subject: "user_3" });

    await expect(
      t.mutation(api.core.mutations.createOrGetUser, {
        email: "   ",
        name: "Ada",
      })
    ).rejects.toThrow(/Email is required/i);

    await expect(
      t.mutation(api.core.mutations.createOrGetUser, {
        email: "a@example.com",
        name: " ",
      })
    ).rejects.toThrow(/Name is required/i);
  });
});
