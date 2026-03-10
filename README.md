# LoanPilot Monorepo

## Package manager decision (Milestone 0)

- **`apps/web` uses pnpm** (managed from the repo root workspace).
- **`services/mortgage-data-engine` remains npm-managed** for now to preserve its already-verified install/dev flow.

This is a deliberate temporary split. Root scripts call `pnpm` for the web app and `npm --prefix` for the worker.

## Common commands (run from repo root)

- Web: `pnpm web:dev` / `pnpm web:typecheck` / `pnpm web:test`
- Convex (web): `pnpm convex:dev`
- Worker: `pnpm worker:dev` / `pnpm worker:typecheck`
