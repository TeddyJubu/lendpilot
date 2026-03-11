/**
 * @organ core
 * @tissue crons
 * @description Scheduled Convex jobs.
 *   Intentionally empty in Phase 0.1; organs add cron triggers as they ship.
 * @depends-on
 *   - convex/schema.ts
 * @depended-by
 *   - Future organs with periodic maintenance (feed generation, refi monitor, etc.)
 */

import { cronJobs } from "convex/server";

const crons = cronJobs();

export default crons;
