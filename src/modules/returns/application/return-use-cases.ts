/**
 * Returns Application Use-Cases & Repository Interface (MerchantOS Phase 5).
 */

import type { ProcessCustomerReturnInput, ReturnRecord } from "../domain/returns.js";

export interface ReturnRepository {
  findById(merchantId: string, id: string): Promise<ReturnRecord | null>;
  findByNumber(merchantId: string, returnNumber: string): Promise<ReturnRecord | null>;
  createCustomerReturn(input: ProcessCustomerReturnInput): Promise<ReturnRecord>;
}

export class ProcessCustomerReturnUseCase {
  constructor(private readonly repo: ReturnRepository) {}

  async execute(input: ProcessCustomerReturnInput): Promise<ReturnRecord> {
    if (input.items.length === 0) {
      throw new Error("Cannot process return with empty items list");
    }
    const existing = await this.repo.findByNumber(input.merchantId, input.returnNumber);
    if (existing) {
      throw new Error(`Return number ${input.returnNumber} already exists`);
    }
    return this.repo.createCustomerReturn(input);
  }
}
