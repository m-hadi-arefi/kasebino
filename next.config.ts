import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** ADR-119 — keep in sync with `src/infrastructure/security/runtime.ts`. */
function nextSecurityHeaders(): { key: string; value: string }[] {
  const mos = (process.env.MOS_ENV ?? "").trim().toLowerCase();
  const node = (process.env.NODE_ENV ?? "development").trim().toLowerCase();
  const env = mos || node;
  const headers: { key: string; value: string }[] = [
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; "),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];
  if (env === "staging" || env === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** ADR-067 — production image uses Next standalone output. */
  output: "standalone",
  // Pin tracing root so a parent package-lock elsewhere on the machine is ignored.
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url))),
  /**
   * ADR-119 — Helmet-equivalent defaults on HTML/document responses
   * (middleware also applies on dynamic/API paths).
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: nextSecurityHeaders(),
      },
    ];
  },
  /**
   * ADR-095 — resolve TypeScript ESM `.js` import specifiers to `.ts` sources
   * (contracts use NodeNext + .js extensions; Next/webpack needs the alias).
   * Keep Node-only packages out of the browser bundle (ADR-110 Mongo plane).
   */
  serverExternalPackages: ["mongodb", "mqtt", "redis", "pg", "drizzle-orm"],
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        aws4: false,
      };
    }
    return config;
  },
};

export default nextConfig;
