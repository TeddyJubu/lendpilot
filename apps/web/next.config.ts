import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  // Monorepo-friendly: prevents Next from picking an unrelated lockfile outside this repo.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
