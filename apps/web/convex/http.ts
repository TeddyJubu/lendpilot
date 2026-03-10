/**
 * @organ core
 * @tissue http
 * @description HTTP action router for inbound requests (e.g. Cloudflare Worker → Convex ingestion).
 *   Intentionally empty in Phase 0.1; routes are added in later phases.
 * @depends-on
 *   - convex/schema.ts (tables exist for any ingestion targets)
 * @depended-by
 *   - services/mortgage-data-engine (Phase 6+ write-back layer)
 */

import { httpRouter } from "convex/server";

const http = httpRouter();

export default http;
