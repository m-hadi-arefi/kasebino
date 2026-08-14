/**
 * Fake accounting provider for tests (ADR-126) — idempotent by eventId.
 */

import type {
  AccountingProvider,
  AccountingSyncResult,
  RecordInventoryAdjustmentInput,
  RecordPaymentInput,
  RecordSaleInput,
  SyncCustomerInput,
  SyncProductInput,
} from "../../application/ports/accounting-provider.js";

export class FakeAccountingProvider implements AccountingProvider {
  readonly providerId = "fake";
  readonly calls: Array<{ method: string; eventId: string }> = [];
  private readonly applied = new Map<string, string>();
  private seq = 0;

  private apply(method: string, eventId: string): AccountingSyncResult {
    this.calls.push({ method, eventId });
    const prior = this.applied.get(eventId);
    if (prior) {
      return { ok: true, externalId: prior, alreadyApplied: true };
    }
    this.seq += 1;
    const externalId = `fake-${method}-${this.seq}`;
    this.applied.set(eventId, externalId);
    return { ok: true, externalId, alreadyApplied: false };
  }

  async syncProduct(input: SyncProductInput): Promise<AccountingSyncResult> {
    return this.apply("syncProduct", input.eventId);
  }
  async syncCustomer(input: SyncCustomerInput): Promise<AccountingSyncResult> {
    return this.apply("syncCustomer", input.eventId);
  }
  async syncSupplier(input: { eventId: string }): Promise<AccountingSyncResult> {
    return this.apply("syncSupplier", input.eventId);
  }
  async recordSale(input: RecordSaleInput): Promise<AccountingSyncResult> {
    return this.apply("recordSale", input.eventId);
  }
  async recordPayment(input: RecordPaymentInput): Promise<AccountingSyncResult> {
    return this.apply("recordPayment", input.eventId);
  }
  async recordInventoryAdjustment(
    input: RecordInventoryAdjustmentInput,
  ): Promise<AccountingSyncResult> {
    return this.apply("recordInventoryAdjustment", input.eventId);
  }
  async recordPurchase(input: { eventId: string }): Promise<AccountingSyncResult> {
    return this.apply("recordPurchase", input.eventId);
  }
  async recordReturn(input: { eventId: string }): Promise<AccountingSyncResult> {
    return this.apply("recordReturn", input.eventId);
  }
  async recordExpense(input: { eventId: string }): Promise<AccountingSyncResult> {
    return this.apply("recordExpense", input.eventId);
  }
  async recordTransfer(input: { eventId: string }): Promise<AccountingSyncResult> {
    return this.apply("recordTransfer", input.eventId);
  }
}
