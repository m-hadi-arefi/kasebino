import type { Merchant } from "./merchant.js";
import type { MerchantStatus } from "./merchant-status.js";

export type ListMerchantsInput = {
  status?: MerchantStatus;
  limit?: number;
  offset?: number;
};

/** Domain port — Drizzle adapter follows schema stub (ARD-003 migrations). */
export type MerchantRepository = {
  save(merchant: Merchant): Promise<void>;
  findById(id: string): Promise<Merchant | null>;
  findBySlug(slug: string): Promise<Merchant | null>;
  /** AUTH-06 / ADR-121 — resolve merchant row for JWT claim upgrade. */
  findByOwnerUserId(ownerUserId: string): Promise<Merchant | null>;
  update(merchant: Merchant): Promise<void>;
  /** Platform admin browse (ADR-013); optional status filter. */
  list(input?: ListMerchantsInput): Promise<Merchant[]>;
};
