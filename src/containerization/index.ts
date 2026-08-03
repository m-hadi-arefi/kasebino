/**
 * ADR-067 — Containerization Standards contract.
 *
 * Multi-stage Next.js production image: non-root, standalone, healthcheck,
 * no secrets baked. Aligns with 12-factor process rules and ADR-068 env/secrets.
 * Local Compose `app` remains bind-mount/dev (ADR-066).
 */

/** Dockerfile stages (deps → builder → runner). */
export const DOCKERFILE_STAGES = ["deps", "builder", "runner"] as const;

export type DockerfileStage = (typeof DOCKERFILE_STAGES)[number];

/** Repo-root containerization files (ADR-067 Decision). */
export const CONTAINER_FILES = {
  dockerfile: "Dockerfile",
  dockerignore: ".dockerignore",
  nextConfig: "next.config.ts",
  healthRoute: "app/api/health/route.ts",
} as const;

/** Non-root runtime identity in the runner stage. */
export const NON_ROOT_USER = {
  user: "nextjs",
  uid: 1001,
  group: "nodejs",
  gid: 1001,
  dockerfileUserDirective: "USER nextjs",
} as const;

/** Next.js output mode required for thin runner images. */
export const NEXT_STANDALONE = {
  output: "standalone",
  serverEntrypoint: "server.js",
  dockerfileCmd: 'CMD ["node", "server.js"]',
} as const;

/**
 * Ops probe paths (ARD-001).
 * Health = liveness (implemented). Ready = DB/Redis readiness (reserved).
 */
export const CONTAINER_PROBES = {
  healthPath: "/api/health",
  readyPath: "/api/ready",
  healthImplemented: true,
  readyImplemented: false,
  dockerfileHealthcheckContains: "/api/health",
} as const;

/**
 * Paths/patterns that must never enter the image build context.
 * Cross-ref ADR-068 — secrets via env/secret manager only.
 */
export const DOCKERIGNORE_REQUIRED = [
  "node_modules",
  ".next",
  ".env",
  ".env.*",
] as const;

/** Forbidden baked secret patterns inside Dockerfile (ENV with secret values). */
export const FORBIDDEN_DOCKERFILE_SECRET_PATTERNS = [
  /ENV\s+AUTH_SECRET=/i,
  /ENV\s+DATABASE_URL=/i,
  /ENV\s+REDIS_URL=/i,
  /ENV\s+MONGODB_URL=/i,
  /ENV\s+POSTGRES_PASSWORD=/i,
  /ENV\s+JWT_SECRET=/i,
  /ENV\s+SMS_API_KEY=/i,
  /ENV\s+PSP_API_KEY=/i,
] as const;

/**
 * Twelve-factor process rules enforced for the app container.
 * Config/secrets still owned by ADR-068; this locks image/runtime discipline.
 */
export const TWELVE_FACTOR_RULES = {
  /** III. Config — store config in the environment (never bake). */
  configViaEnv: true,
  /** VI. Processes — execute as one or more stateless processes. */
  statelessProcess: true,
  /** VII. Port binding — export services via port bind. */
  portBinding: true,
  /** VIII. Concurrency — scale out via process model (multi-instance later ADR-071). */
  scaleOutReady: true,
  /** IX. Disposability — fast start/stop; healthcheck supports orchestration. */
  disposability: true,
  /** X. Dev/prod parity — same image artifact promoted across envs. */
  devProdParity: true,
  /** XI. Logs — treat logs as event streams (stdout/stderr). */
  logsToStdout: true,
  /** Secrets never copied into layers. */
  noSecretsInImage: true,
} as const;

export const CONTAINERIZATION_REQUIREMENTS = {
  multiStage: true,
  nonRoot: true,
  nextStandalone: true,
  healthcheck: true,
  dockerignore: true,
  noSecretsBaked: true,
  twelveFactor: true,
} as const;

export function isDockerfileStage(name: string): name is DockerfileStage {
  return (DOCKERFILE_STAGES as readonly string[]).includes(name);
}

export function assertNonRootRuntime(userDirective: string): void {
  const trimmed = userDirective.trim();
  if (
    trimmed === "USER root" ||
    trimmed === "USER 0" ||
    !/USER\s+nextjs\b/i.test(trimmed)
  ) {
    throw new Error(
      "Runner stage must use non-root USER nextjs (ADR-067).",
    );
  }
}

export function assertNoSecretsBaked(dockerfile: string): void {
  for (const pattern of FORBIDDEN_DOCKERFILE_SECRET_PATTERNS) {
    if (pattern.test(dockerfile)) {
      throw new Error(
        `Dockerfile must not bake secrets (${pattern}); use env/secret manager (ADR-067 / ADR-068).`,
      );
    }
  }
}

export function assertStandaloneOutput(outputMode: string | undefined): void {
  if (outputMode !== NEXT_STANDALONE.output) {
    throw new Error(
      `Next.js output must be "${NEXT_STANDALONE.output}" for production images (ADR-067).`,
    );
  }
}

export function assertHealthcheckTargetsHealth(dockerfile: string): void {
  if (!/HEALTHCHECK/i.test(dockerfile)) {
    throw new Error("Dockerfile must declare HEALTHCHECK (ADR-067).");
  }
  if (!dockerfile.includes(CONTAINER_PROBES.healthPath)) {
    throw new Error(
      `HEALTHCHECK must target ${CONTAINER_PROBES.healthPath} (ADR-067).`,
    );
  }
}

/**
 * Lightweight stage-name extraction for Dockerfile `AS <stage>` clauses.
 */
export function extractDockerfileStages(dockerfile: string): string[] {
  const stages: string[] = [];
  const re = /\bAS\s+([a-z][a-z0-9_-]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(dockerfile)) !== null) {
    stages.push(match[1]!.toLowerCase());
  }
  return stages;
}

export function extractDockerfileUser(dockerfile: string): string | null {
  const match = /^USER\s+(\S+)\s*$/im.exec(dockerfile);
  return match?.[1] ?? null;
}

export const CONTAINERIZATION = {
  stages: DOCKERFILE_STAGES,
  files: CONTAINER_FILES,
  nonRoot: NON_ROOT_USER,
  standalone: NEXT_STANDALONE,
  probes: CONTAINER_PROBES,
  dockerignore: DOCKERIGNORE_REQUIRED,
  twelveFactor: TWELVE_FACTOR_RULES,
  requirements: CONTAINERIZATION_REQUIREMENTS,
} as const;
