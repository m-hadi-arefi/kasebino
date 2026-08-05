import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { COMPOSE_FILES } from "../docker-compose-parity/index.js";
import {
  AUTH_SECRET_ENV,
  AUTH_SECRET_PLACEHOLDERS,
  CONFIG_FAIL_EDGE_MESSAGES,
  CONNECTION_URL_ENV,
  ENV_EXAMPLE_DOCUMENTED_KEYS,
  ENV_SECRETS,
  ENV_SECRETS_REQUIREMENTS,
  EnvConfigError,
  REQUIRED_BOOT_KEYS,
  SECRET_ENV_KEYS,
  SECRET_POLICY,
  assertAuthSecretSeparate,
  assertPersianConfigFailMessage,
  assertRequiredEnvInProduction,
  assertSecretsNotCommitted,
  isAuthSecretPlaceholder,
  parseEnv,
  resolveNodeEnv,
} from "./index.js";

const root = process.cwd();

function isGitTracked(relativePath: string): boolean {
  const out = execFileSync("git", ["ls-files", "--", relativePath], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  return out.length > 0;
}

function completeEnv(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "development",
    DATABASE_URL: "postgres://merchantos:merchantos@localhost:5432/merchantos",
    REDIS_URL: "redis://localhost:6379",
    AUTH_SECRET: "local-dev-auth-secret-not-for-prod",
    ...overrides,
  };
}

describe("ADR-068 Environment and Secret Management", () => {
  it("requires DATABASE_URL, REDIS_URL, and separate AUTH_SECRET at boot", () => {
    expect(CONNECTION_URL_ENV.database).toBe("DATABASE_URL");
    expect(CONNECTION_URL_ENV.redis).toBe("REDIS_URL");
    expect(AUTH_SECRET_ENV).toBe("AUTH_SECRET");
    expect(REQUIRED_BOOT_KEYS).toEqual(
      expect.arrayContaining([
        "NODE_ENV",
        "DATABASE_URL",
        "REDIS_URL",
        "AUTH_SECRET",
      ]),
    );
    expect(ENV_SECRETS_REQUIREMENTS.databaseUrlAndRedisUrl).toBe(true);
    expect(ENV_SECRETS_REQUIREMENTS.authSecretSeparate).toBe(true);
    expect(ENV_SECRETS_REQUIREMENTS.zodFreeParseEnv).toBe(true);

    expect(() =>
      assertAuthSecretSeparate("AUTH_SECRET", [
        "POSTGRES_PASSWORD",
        "MINIO_ROOT_PASSWORD",
      ]),
    ).not.toThrow();
    expect(() =>
      assertAuthSecretSeparate("JWT_SECRET", ["POSTGRES_PASSWORD"]),
    ).toThrow(/AUTH_SECRET/);
    expect(() =>
      assertAuthSecretSeparate("AUTH_SECRET", ["AUTH_SECRET"]),
    ).toThrow(/must not be reused/);
  });

  it("classifies secret keys and never commits real secrets (.env.example only)", () => {
    expect(SECRET_POLICY.commitEnvExampleOnly).toBe(true);
    expect(SECRET_POLICY.neverCommitDotEnv).toBe(true);
    expect(SECRET_POLICY.secretsViaEnvOrSecretManager).toBe(true);
    expect(SECRET_ENV_KEYS).toEqual(
      expect.arrayContaining(["AUTH_SECRET", "POSTGRES_PASSWORD"]),
    );

    const envPath = join(root, COMPOSE_FILES.envExample);
    const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
    expect(existsSync(envPath)).toBe(true);
    expect(gitignore).toMatch(/^\.env$/m);
    expect(gitignore).toMatch(/!\.env\.example/);

    expect(() =>
      assertSecretsNotCommitted({
        // Local `.env` is expected for dev; contract forbids *committing* it.
        dotEnvExistsInRepo: isGitTracked(".env"),
        envExampleExists: existsSync(envPath),
      }),
    ).not.toThrow();
    expect(() =>
      assertSecretsNotCommitted({
        dotEnvExistsInRepo: true,
        envExampleExists: true,
      }),
    ).toThrow(/\.env must not be committed/);
  });

  it("documents required keys in .env.example with placeholder AUTH_SECRET", () => {
    const env = readFileSync(join(root, COMPOSE_FILES.envExample), "utf8");
    for (const key of ENV_EXAMPLE_DOCUMENTED_KEYS) {
      expect(env).toMatch(new RegExp(`^${key}=`, "m"));
    }
    expect(env).toMatch(/^AUTH_SECRET=/m);
    expect(env).toMatch(/change-me-auth-secret|change-me/i);
    expect(env.toLowerCase()).toMatch(/do not commit|never commit|placeholder/i);

    const authLine = env
      .split(/\r?\n/)
      .find((line) => line.startsWith("AUTH_SECRET="));
    expect(authLine).toBeDefined();
    const authValue = authLine!.slice("AUTH_SECRET=".length);
    expect(isAuthSecretPlaceholder(authValue)).toBe(true);
    expect(AUTH_SECRET_PLACEHOLDERS.length).toBeGreaterThan(0);
  });

  it("parseEnv succeeds with complete env and returns typed URLs + AUTH_SECRET", () => {
    const parsed = parseEnv(completeEnv());
    expect(parsed.nodeEnv).toBe("development");
    expect(parsed.databaseUrl).toContain("postgres://");
    expect(parsed.redisUrl).toContain("redis://");
    expect(parsed.authSecret.length).toBeGreaterThan(8);
    expect(parsed.source).toBe("process_env");
    expect(resolveNodeEnv({ NODE_ENV: "test" })).toBe("test");
  });

  it("fail-fast in production when required keys are missing", () => {
    expect(ENV_SECRETS_REQUIREMENTS.failFastMissingInProduction).toBe(true);

    expect(() =>
      parseEnv(
        completeEnv({
          NODE_ENV: "production",
          DATABASE_URL: undefined,
        }),
      ),
    ).toThrow(EnvConfigError);

    try {
      parseEnv(
        completeEnv({
          NODE_ENV: "production",
          REDIS_URL: "",
          AUTH_SECRET: "production-grade-auth-secret-32b",
        }),
      );
      expect.unreachable("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvConfigError);
      const cfg = error as EnvConfigError;
      expect(cfg.missingKeys).toContain("REDIS_URL");
      expect(cfg.edgeMessageFa).toBe(CONFIG_FAIL_EDGE_MESSAGES.fa);
      expect(cfg.code).toBe("ENV_CONFIG_INVALID");
      expect(cfg.message).toMatch(/پیکربندی/);
    }

    expect(() =>
      assertRequiredEnvInProduction(
        completeEnv({
          NODE_ENV: "production",
          AUTH_SECRET: undefined,
        }),
      ),
    ).toThrow(/AUTH_SECRET/);

    expect(() =>
      assertRequiredEnvInProduction(completeEnv({ NODE_ENV: "development" })),
    ).not.toThrow();
  });

  it("rejects placeholder AUTH_SECRET in production-like environments", () => {
    expect(() =>
      parseEnv(
        completeEnv({
          NODE_ENV: "production",
          AUTH_SECRET: "change-me-auth-secret",
        }),
      ),
    ).toThrow(/AUTH_SECRET/);

    expect(() =>
      parseEnv(
        completeEnv({
          NODE_ENV: "staging",
          AUTH_SECRET: "short",
        }),
      ),
    ).toThrow(/16 characters/);

    expect(() =>
      parseEnv(
        completeEnv({
          NODE_ENV: "production",
          AUTH_SECRET: "production-grade-auth-secret-32b",
        }),
      ),
    ).not.toThrow();
  });

  it("exposes Persian config-fail edge messages (Iranian First)", () => {
    expect(CONFIG_FAIL_EDGE_MESSAGES.fa).toMatch(/[\u0600-\u06FF]/);
    expect(CONFIG_FAIL_EDGE_MESSAGES.fa).toContain("پیکربندی");
    expect(ENV_SECRETS_REQUIREMENTS.persianConfigFailAtEdge).toBe(true);
    expect(() =>
      assertPersianConfigFailMessage(CONFIG_FAIL_EDGE_MESSAGES.fa),
    ).not.toThrow();
    expect(() => assertPersianConfigFailMessage("Config invalid")).toThrow(
      /Persian/,
    );
  });

  it("exports ENV_SECRETS aggregate contract", () => {
    expect(ENV_SECRETS.authSecretEnv).toBe("AUTH_SECRET");
    expect(ENV_SECRETS.connectionUrlEnv.database).toBe("DATABASE_URL");
    expect(ENV_SECRETS.connectionUrlEnv.redis).toBe("REDIS_URL");
    expect(ENV_SECRETS.secretPolicy.vaultSopsLater).toBe(true);
    expect(ENV_SECRETS.requirements.noRealSecretsInRepo).toBe(true);
  });
});
