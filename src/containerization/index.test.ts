import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTAINER_FILES,
  CONTAINER_PROBES,
  CONTAINERIZATION,
  CONTAINERIZATION_REQUIREMENTS,
  DOCKERFILE_STAGES,
  DOCKERIGNORE_REQUIRED,
  NEXT_STANDALONE,
  NON_ROOT_USER,
  TWELVE_FACTOR_RULES,
  assertHealthcheckTargetsHealth,
  assertNoSecretsBaked,
  assertNonRootRuntime,
  assertStandaloneOutput,
  extractDockerfileStages,
  extractDockerfileUser,
  isDockerfileStage,
} from "./index.js";

const root = process.cwd();

describe("ADR-067 Containerization Standards", () => {
  it("locks multi-stage Dockerfile names (deps → builder → runner)", () => {
    expect(DOCKERFILE_STAGES).toEqual(["deps", "builder", "runner"]);
    expect(isDockerfileStage("runner")).toBe(true);
    expect(isDockerfileStage("base")).toBe(false);
    expect(CONTAINERIZATION.stages).toEqual(DOCKERFILE_STAGES);
    expect(CONTAINERIZATION_REQUIREMENTS.multiStage).toBe(true);
  });

  it("requires non-root nextjs user and standalone Next output", () => {
    expect(NON_ROOT_USER.user).toBe("nextjs");
    expect(NON_ROOT_USER.uid).toBe(1001);
    expect(NON_ROOT_USER.dockerfileUserDirective).toBe("USER nextjs");
    expect(NEXT_STANDALONE.output).toBe("standalone");
    expect(NEXT_STANDALONE.serverEntrypoint).toBe("server.js");
    expect(CONTAINERIZATION_REQUIREMENTS.nonRoot).toBe(true);
    expect(CONTAINERIZATION_REQUIREMENTS.nextStandalone).toBe(true);
    expect(() => assertNonRootRuntime("USER nextjs")).not.toThrow();
    expect(() => assertNonRootRuntime("USER root")).toThrow(/non-root/i);
    expect(() => assertStandaloneOutput("standalone")).not.toThrow();
    expect(() => assertStandaloneOutput("export")).toThrow(/standalone/i);
  });

  it("requires health + reserved ready probes and 12-factor process rules", () => {
    expect(CONTAINER_PROBES.healthPath).toBe("/api/health");
    expect(CONTAINER_PROBES.readyPath).toBe("/api/ready");
    expect(CONTAINER_PROBES.healthImplemented).toBe(true);
    expect(CONTAINER_PROBES.readyImplemented).toBe(false);
    expect(TWELVE_FACTOR_RULES.configViaEnv).toBe(true);
    expect(TWELVE_FACTOR_RULES.statelessProcess).toBe(true);
    expect(TWELVE_FACTOR_RULES.portBinding).toBe(true);
    expect(TWELVE_FACTOR_RULES.logsToStdout).toBe(true);
    expect(TWELVE_FACTOR_RULES.noSecretsInImage).toBe(true);
    expect(CONTAINERIZATION_REQUIREMENTS.twelveFactor).toBe(true);
    expect(CONTAINERIZATION_REQUIREMENTS.healthcheck).toBe(true);
    expect(CONTAINERIZATION_REQUIREMENTS.noSecretsBaked).toBe(true);
  });

  it("ships Dockerfile with stages, non-root USER, HEALTHCHECK, no baked secrets", () => {
    const dockerfilePath = join(root, CONTAINER_FILES.dockerfile);
    expect(existsSync(dockerfilePath)).toBe(true);
    const dockerfile = readFileSync(dockerfilePath, "utf8");

    const stages = extractDockerfileStages(dockerfile);
    expect(stages).toEqual(["deps", "builder", "runner"]);

    expect(extractDockerfileUser(dockerfile)).toBe(NON_ROOT_USER.user);
    expect(dockerfile).toMatch(/USER\s+nextjs/);
    expect(dockerfile).toContain(NEXT_STANDALONE.serverEntrypoint);
    expect(dockerfile).toMatch(/output.*standalone|standalone/i);

    expect(() => assertHealthcheckTargetsHealth(dockerfile)).not.toThrow();
    expect(dockerfile).toContain(CONTAINER_PROBES.healthPath);

    expect(() => assertNoSecretsBaked(dockerfile)).not.toThrow();
    expect(() =>
      assertNoSecretsBaked(`${dockerfile}\nENV AUTH_SECRET=super-secret\n`),
    ).toThrow(/bake secrets/i);
  });

  it("ships .dockerignore excluding secrets, node_modules, and .next", () => {
    const ignorePath = join(root, CONTAINER_FILES.dockerignore);
    expect(existsSync(ignorePath)).toBe(true);
    const ignore = readFileSync(ignorePath, "utf8");
    for (const entry of DOCKERIGNORE_REQUIRED) {
      expect(ignore).toContain(entry);
    }
    expect(CONTAINERIZATION_REQUIREMENTS.dockerignore).toBe(true);
  });

  it("enables Next standalone output in next.config.ts", () => {
    const configPath = join(root, CONTAINER_FILES.nextConfig);
    expect(existsSync(configPath)).toBe(true);
    const config = readFileSync(configPath, "utf8");
    expect(config).toMatch(/output:\s*["']standalone["']/);
  });

  it("ships liveness health route for Dockerfile HEALTHCHECK", () => {
    const healthPath = join(root, CONTAINER_FILES.healthRoute);
    expect(existsSync(healthPath)).toBe(true);
    const src = readFileSync(healthPath, "utf8");
    expect(src).toMatch(/export\s+function\s+GET/);
    expect(src).toContain('"ok"');
    expect(src).toMatch(/status/);
  });
});
