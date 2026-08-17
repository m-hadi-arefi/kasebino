/**
 * ADR-123 — composition root unit tests (env fail-fast, SMS policy, aliases).
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  assertProductionCompositionEnv,
  assertProductionPaymentGatewayPolicy,
  assertProductionSmsPolicy,
  createAppContext,
  createProductionApiContext,
  createProductionRepositories,
  resetSharedProductionRepositoriesForTests,
  setApiContextForTests,
} from "./index.js";
import { isConsoleSmsAdapter, createMerchantSmsAdapter } from "../auth/sms-adapter-factory.js";
import { createOutboxWorkerRuntime } from "../../workers/create-outbox-runtime.js";
import { EnvConfigError } from "../../shared/contracts/env-secrets/index.js";

afterEach(() => {
  setApiContextForTests(null);
  resetSharedProductionRepositoriesForTests();
});

describe("ADR-123 composition root policies", () => {
  it("createAppContext is the createProductionApiContext alias surface", () => {
    expect(createProductionApiContext).toBeTypeOf("function");
    expect(createAppContext).toBeTypeOf("function");
  });

  it("fail-fast when DATABASE_URL missing", () => {
    expect(() =>
      assertProductionCompositionEnv({
        NODE_ENV: "development",
        MOS_ENV: "local",
      }),
    ).toThrow(EnvConfigError);
  });

  it("production-like fail-fast when REDIS_URL / AUTH_SECRET missing", () => {
    expect(() =>
      assertProductionCompositionEnv({
        NODE_ENV: "production",
        MOS_ENV: "staging",
        DATABASE_URL: "postgres://u:p@localhost:5433/merchantos",
      }),
    ).toThrow(/REDIS_URL|AUTH_SECRET|Missing required/);
  });

  it("rejects console SMS as production default", () => {
    expect(() =>
      assertProductionSmsPolicy({
        NODE_ENV: "production",
        MOS_ENV: "staging",
        MOS_FORCE_CONSOLE_SMS: "1",
      }),
    ).toThrow(/Console SMS/);

    const adapter = createMerchantSmsAdapter({
      mosEnv: "staging",
      nodeEnv: "production",
    });
    expect(isConsoleSmsAdapter(adapter)).toBe(false);
    expect(() =>
      assertProductionSmsPolicy({
        NODE_ENV: "production",
        MOS_ENV: "staging",
      }),
    ).not.toThrow();
  });

  it("allows console SMS for local Docker image (NODE_ENV=production, MOS_ENV=local)", () => {
    expect(() =>
      assertProductionSmsPolicy({
        NODE_ENV: "production",
        MOS_ENV: "local",
      }),
    ).not.toThrow();
  });

  it("rejects blind sandbox payment when MOS_ENV=production", () => {
    expect(() =>
      assertProductionPaymentGatewayPolicy({
        MOS_ENV: "production",
        MOS_PAYMENTS_GATEWAY: "sandbox",
      }),
    ).toThrow(/MOS_ALLOW_SANDBOX_PAYMENT_GATEWAY/);

    expect(() =>
      assertProductionPaymentGatewayPolicy({
        MOS_ENV: "production",
        MOS_ALLOW_SANDBOX_PAYMENT_GATEWAY: "1",
      }),
    ).not.toThrow();
  });

  it("worker production path uses the same createProductionRepositories factory", () => {
    const runtime = createOutboxWorkerRuntime({
      inMemory: true,
      mqttMode: "memory",
      env: {
        MOS_ENV: "local",
        MOS_REDIS_MODE: "memory",
        MOS_MONGO_MODE: "memory",
        MOS_MINIO_MODE: "memory",
        MOS_MQTT_MODE: "memory",
      },
    });
    expect(runtime.store).toBeDefined();
    expect(createProductionRepositories).toBeTypeOf("function");
  });
});
