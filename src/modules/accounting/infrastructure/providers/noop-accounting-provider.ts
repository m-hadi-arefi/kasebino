/**
 * No-op accounting provider (ADR-126) — default when ERPNext is not configured.
 */

import type {
  AccountingProvider,
  AccountingSyncResult,
} from "../../application/ports/accounting-provider.js";

function okNoop(): AccountingSyncResult {
  return { ok: true, externalId: null, alreadyApplied: false, message: "noop" };
}

export class NoopAccountingProvider implements AccountingProvider {
  readonly providerId = "noop";

  async syncProduct(): Promise<AccountingSyncResult> {
    return okNoop();
  }
  async syncCustomer(): Promise<AccountingSyncResult> {
    return okNoop();
  }
  async recordSale(): Promise<AccountingSyncResult> {
    return okNoop();
  }
  async recordPayment(): Promise<AccountingSyncResult> {
    return okNoop();
  }
  async recordInventoryAdjustment(): Promise<AccountingSyncResult> {
    return okNoop();
  }
  async recordPurchase(): Promise<AccountingSyncResult> {
    return {
      ok: false,
      externalId: null,
      alreadyApplied: false,
      message: "purchase_unsupported",
    };
  }
  async recordReturn(): Promise<AccountingSyncResult> {
    return {
      ok: false,
      externalId: null,
      alreadyApplied: false,
      message: "return_unsupported",
    };
  }
}
