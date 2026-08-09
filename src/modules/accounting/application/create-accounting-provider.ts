/**
 * Resolve AccountingProvider from env (ADR-126 / ADR-140).
 */

import type { AccountingProvider } from "./ports/accounting-provider.js";
import { FakeAccountingProvider } from "../infrastructure/providers/fake-accounting-provider.js";
import { NoopAccountingProvider } from "../infrastructure/providers/noop-accounting-provider.js";
import { createErpNextAccountingProviderFromEnv } from "../infrastructure/providers/erpnext/index.js";

export type AccountingProviderId = "noop" | "fake" | "erpnext";

export function resolveAccountingProviderId(
  env: NodeJS.ProcessEnv = process.env,
): AccountingProviderId {
  const raw = (env.MOS_ACCOUNTING_PROVIDER ?? "noop").trim().toLowerCase();
  if (raw === "fake") return "fake";
  if (raw === "erpnext") return "erpnext";
  return "noop";
}

export function createAccountingProvider(
  env: NodeJS.ProcessEnv = process.env,
  opts?: {
    fetchImpl?: typeof fetch;
    resolveExternalId?: (input: {
      entityType: string;
      entityId: string;
    }) => Promise<string | null>;
  },
): AccountingProvider {
  const id = resolveAccountingProviderId(env);
  if (id === "fake") return new FakeAccountingProvider();
  if (id === "erpnext") {
    return createErpNextAccountingProviderFromEnv(env, {
      ...(opts?.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
      ...(opts?.resolveExternalId
        ? { resolveExternalId: opts.resolveExternalId }
        : {}),
    });
  }
  return new NoopAccountingProvider();
}
