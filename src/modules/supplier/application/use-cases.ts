/**
 * Supplier Use-Cases (MerchantOS Phase 1).
 */

import type { ListSuppliersFilter, SupplierRepository } from "../domain/repositories.js";
import type { CreateSupplierInput, Supplier, SupplierId, UpdateSupplierInput } from "../domain/supplier.js";

export class CreateSupplierUseCase {
  constructor(private readonly repo: SupplierRepository) {}

  async execute(input: CreateSupplierInput): Promise<Supplier> {
    if (!input.name.trim()) {
      throw new Error("Supplier name is required");
    }
    if (input.phone) {
      const existing = await this.repo.findByPhone(input.merchantId, input.phone);
      if (existing) {
        throw new Error(`Supplier with phone number ${input.phone} already exists`);
      }
    }
    return this.repo.create(input);
  }
}

export class UpdateSupplierUseCase {
  constructor(private readonly repo: SupplierRepository) {}

  async execute(
    merchantId: string,
    id: SupplierId,
    input: UpdateSupplierInput,
  ): Promise<Supplier> {
    const existing = await this.repo.findById(merchantId, id);
    if (!existing) {
      throw new Error(`Supplier ${id} not found`);
    }
    return this.repo.update(merchantId, id, input);
  }
}

export class GetSupplierUseCase {
  constructor(private readonly repo: SupplierRepository) {}

  async execute(merchantId: string, id: SupplierId): Promise<Supplier | null> {
    return this.repo.findById(merchantId, id);
  }
}

export class ListSuppliersUseCase {
  constructor(private readonly repo: SupplierRepository) {}

  async execute(filter: ListSuppliersFilter) {
    return this.repo.list(filter);
  }
}

export class GetSupplierStatementUseCase {
  constructor(private readonly repo: SupplierRepository) {}

  async execute(
    merchantId: string,
    supplierId: SupplierId,
    limit: number = 50,
    offset: number = 0,
  ) {
    const supplier = await this.repo.findById(merchantId, supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }
    const transactions = await this.repo.getTransactions(
      merchantId,
      supplierId,
      limit,
      offset,
    );
    return {
      supplier,
      transactions,
    };
  }
}
