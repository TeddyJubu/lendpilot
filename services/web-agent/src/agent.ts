/**
 * Agent factory — wraps @firecrawl/agent-core with LendPilot configuration.
 *
 * Model selection: defaults to claude-haiku-4-5-20251001 (fast + cheap for research tasks).
 * Override via MODEL_PROVIDER + MODEL_ID env vars.
 */

import { createAgent, type FirecrawlAgent } from "@firecrawl/agent-core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "..", "skills");

function loadSkill(filename: string): string {
  const skillPath = join(SKILLS_DIR, filename);
  try {
    return readFileSync(skillPath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to load required skill file: ${skillPath}`, { cause: error });
  }
}

export const SKILLS = {
  discoverRateSources: loadSkill("discover-rate-sources.md"),
  scanRegulatoryLandscape: loadSkill("scan-regulatory-landscape.md"),
};

export function getAgent(): FirecrawlAgent {
  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is required");
  }

  const provider = (process.env.MODEL_PROVIDER ?? "anthropic") as
    | "anthropic"
    | "openai"
    | "google";
  const model = process.env.MODEL_ID ?? "claude-haiku-4-5-20251001";

  return createAgent({
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
    model: { provider, model },
  });
}
