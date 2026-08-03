import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** ADR-067 — production image uses Next standalone output. */
  output: "standalone",
  // Pin tracing root so a parent package-lock elsewhere on the machine is ignored.
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url))),
};

export default nextConfig;
