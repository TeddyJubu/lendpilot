/**
 * LendPilot Web Agent — Express API server
 *
 * Wraps @firecrawl/agent-core for two autonomous research tasks:
 *   POST /v1/run/lender-discovery   — Find new wholesale TPO portals
 *   POST /v1/run/regulatory-scan    — Surface regulatory updates
 *
 * Called by the mortgage-data-engine Worker on a weekly/daily cron schedule.
 * Results are automatically posted back to the Worker via the LendPilot client.
 *
 * Auth: all /v1/* routes require `Authorization: Bearer <LENDPILOT_AGENT_API_KEY>`.
 */

import express, { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { runLenderDiscovery } from "./src/tasks/lender-discovery.js";
import { runRegulatoryScan } from "./src/tasks/regulatory-scan.js";
import { SKILLS } from "./src/agent.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ─── CORS ───
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// ─── Request ID ───
app.use((_req, res, next) => {
  res.locals["requestId"] = _req.headers["x-request-id"] ?? randomUUID();
  next();
});

// ─── Auth middleware for all /v1/* routes ───
const AGENT_API_KEY = process.env.LENDPILOT_AGENT_API_KEY?.trim();

app.use("/v1", (_req: Request, res: Response, next: NextFunction) => {
  if (!AGENT_API_KEY) {
    res.status(503).json({ error: "Service unavailable: authentication not configured" });
    return;
  }
  const auth = _req.headers.authorization;
  if (!auth || auth !== `Bearer ${AGENT_API_KEY}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

// ─── Health / root ───
app.get("/", (_req, res) => {
  res.json({
    service: "lendpilot-web-agent",
    status: "ok",
    routes: [
      "POST /v1/run/lender-discovery",
      "POST /v1/run/regulatory-scan",
      "GET  /v1/skills",
      "GET  /health",
    ],
  });
});

app.get("/health", (_req, res) => {
  const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;
  const hasLlmKey =
    !!process.env.ANTHROPIC_API_KEY ||
    !!process.env.OPENAI_API_KEY ||
    !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  res.status(hasFirecrawlKey && hasLlmKey ? 200 : 503).json({
    status: hasFirecrawlKey && hasLlmKey ? "ok" : "degraded",
    checks: {
      firecrawl_api_key: hasFirecrawlKey,
      llm_api_key: hasLlmKey,
      worker_url: !!process.env.LENDPILOT_WORKER_URL,
    },
  });
});

// ─── List available skills ───
app.get("/v1/skills", (_req, res) => {
  res.json({
    skills: [
      {
        id: "discover-rate-sources",
        name: "Discover Wholesale Rate Sources",
        description: "Autonomously find new TPO portals and wholesale lenders",
        task_endpoint: "/v1/run/lender-discovery",
      },
      {
        id: "scan-regulatory-landscape",
        name: "Scan Regulatory Landscape",
        description:
          "Surface mortgage guideline changes and regulatory updates",
        task_endpoint: "/v1/run/regulatory-scan",
      },
    ],
    loaded: {
      "discover-rate-sources": SKILLS.discoverRateSources.length > 0,
      "scan-regulatory-landscape": SKILLS.scanRegulatoryLandscape.length > 0,
    },
  });
});

// ─── Task: Lender Discovery ───
app.post("/v1/run/lender-discovery", async (_req: Request, res: Response) => {
  const task_id = res.locals["requestId"] as string;

  console.log(`[lender-discovery] Starting task ${task_id}`);

  try {
    const result = await runLenderDiscovery(task_id);
    console.log(
      `[lender-discovery] Done. Found: ${result.lenders_found}, Ingested: ${result.lenders_ingested}, Time: ${result.duration_ms}ms`
    );
    res.json({ task_id, ...result });
  } catch (err) {
    console.error(`[lender-discovery] Fatal:`, err);
    res.status(500).json({ task_id, error: "Task failed unexpectedly" });
  }
});

// ─── Task: Regulatory Scan ───
app.post("/v1/run/regulatory-scan", async (_req: Request, res: Response) => {
  const task_id = res.locals["requestId"] as string;

  console.log(`[regulatory-scan] Starting task ${task_id}`);

  try {
    const result = await runRegulatoryScan(task_id);
    console.log(
      `[regulatory-scan] Done. Found: ${result.findings_found}, Ingested: ${result.findings_ingested}, High-priority: ${result.high_priority_count}, Time: ${result.duration_ms}ms`
    );
    res.json({ task_id, ...result });
  } catch (err) {
    console.error(`[regulatory-scan] Fatal:`, err);
    res.status(500).json({ task_id, error: "Task failed unexpectedly" });
  }
});

// ─── Error handler ───
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON body" });
  } else {
    console.error("[web-agent] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Start ───
const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.listen(PORT, () => {
  console.log(`[web-agent] Listening on port ${PORT}`);
  if (!process.env.FIRECRAWL_API_KEY) {
    console.warn("[web-agent] WARNING: FIRECRAWL_API_KEY not set");
  }
  if (!process.env.LENDPILOT_AGENT_API_KEY) {
    console.warn("[web-agent] WARNING: LENDPILOT_AGENT_API_KEY not set — no auth on /v1/* routes");
  }
  if (!process.env.LENDPILOT_WORKER_URL) {
    console.warn("[web-agent] WARNING: LENDPILOT_WORKER_URL not set — results will not be posted to Worker");
  }
});

export default app;
