/**
 * @organ core
 * @tissue tests
 * @description Shared Convex test module registry for `convex-test`.
 *   Keeps the test harness pointed at `apps/web/convex`, even though pnpm hoists `node_modules`.
 * @depends-on
 *   - Convex runtime modules under this directory (loaded by tests)
 * @depended-by
 *   - core test suites in this directory
 * @ai-notes
 *   - Keep this glob in sync with Convex docs when the functions directory layout changes.
 *   - The pattern intentionally excludes `.test.*` and `.d.ts` files while including runtime `.ts`/`.js` modules.
 */

type ConvexModuleLoader = () => Promise<unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob: (pattern: string) => Record<string, ConvexModuleLoader>;
};

export const convexModules = (import.meta as ImportMetaWithGlob).glob("./**/!(*.*.*)*.*s");
