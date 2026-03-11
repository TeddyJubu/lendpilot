/**
 * @organ core
 * @tissue schema
 * @description Convex database schema entrypoint for the apps/web backend.
 *   Composes organ-level table definitions into a single defineSchema() call.
 * @depends-on
 *   - convex/core/tables.ts (table definitions)
 * @depended-by
 *   - All Convex queries/mutations/actions in this project
 * @ai-notes
 *   - Keep schema composition minimal in Phase 0.1; organs add their tables incrementally.
 */

import { defineSchema } from "convex/server";

import { coreTables } from "./core/tables";

export default defineSchema({
  ...coreTables,
});
