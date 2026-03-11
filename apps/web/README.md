# LoanPilot — Web App (`apps/web`)

This package is the canonical **LoanPilot** web app scaffold:
- **Next.js 15** (App Router)
- **TypeScript (strict)**
- **Tailwind CSS v4** with design tokens (see `src/styles/globals.css`)

## Status
Foundation scaffold (Phase 0.1). No product features are implemented here yet.

## Commands
Run from `apps/web`:

- Dev server: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Unit tests: `pnpm test`
- Production build: `pnpm build`

## Conventions (important)
- **No raw Tailwind colors** in app code. Use semantic tokens (`bg-background`, `text-foreground`, etc.) defined in `src/styles/globals.css`.
- UI structure is **organ-oriented** under `src/components/` (placeholders only at this stage).
- `src/components/ui/` is reserved for **shadcn/ui generated components** (do not hand-edit generated files when we add them in later phases).

## Backend co-location (later)
Convex organs will live under `apps/web/convex/` in later Foundation tasks (not part of this scaffold).

## Notes on tooling
- The scaffold uses **pnpm**. Keep dependency changes via package manager commands (don’t hand-edit manifests/lockfiles).
- If pnpm prompts about approving build scripts (e.g. `esbuild`, `sharp`), follow the repo security policy; some packages require native binaries for full functionality.
