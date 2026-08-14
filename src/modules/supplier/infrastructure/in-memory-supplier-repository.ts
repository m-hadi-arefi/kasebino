/**
 * In-Memory Supplier Repository Implementation for unit testing (MerchantOS Phase 1).
 */

import {
  ListSuppliersFilter,
  RecordSupplierTransactionInput,
  SupplierRepository,
} from "../domain/repositories.js";
import {
  CreateSupplierInput,
  Supplier,
  SupplierId,
  SupplierTransaction,
  UpdateSupplierInput,
} from "../domain/supplier.js";

export class InMemorySupplierRepository implements SupplierRepository {
  private suppliers = new Map<string, Supplier>();
  private transactions: SupplierTransaction[] = [];

  private getKey(merchantId: string, id: string): string {
    return `${merchantId}:${id}`;
  }

  async findById(merchantId: string, id: SupplierId): Promise<Supplier | null> {
    return this.suppliers.get(this.getKey(merchantId, id)) ?? null;
  }

  async findByPhone(merchantId: string, phone: string): Promise<Supplier | null> {
    for (const s of this.suppliers.values()) {
      if (s.merchantId === merchantId && s.phone === phone) {
        return s;
      }
    }
    return null;
  }

  async list(filter: ListSuppliersFilter): Promise<{ items: Supplier[]; total: number }> {
    let items = Array.from(this.suppliers.values()).filter(
      (s) => s.merchantId === filter.merchantId,
    );

    if (filter.isActive !== undefined) {
      items = items.filter((s) => s.isActive === filter.isActive);
    }
    if (filter.hasBalanceOnly) {
      items = items.filter((s) => s.balanceMinor > 0n);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.contactName?.toLowerCase().includes(q) ||
          s.phone?.includes(q),
      );
    }

    const total = items.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    items = items.slice(offset, offset + limit);

    return { items, total };
  }

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const id = crypto.randomUUID();
    const now = new Date();
    const supplier: Supplier = {
      id,
      merchantId: input.merchantId,
      name: input.name,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      address: input.address,
      city: input.city,
      province: input.province,
      nationalId: input.nationalId,
      taxId: input.taxId,
      balanceMinor: 0n,
      creditLimitMinor: input.creditLimitMinor,
      tags: input.tags ?? [],
      notes: input.notes,
      isActive: true,
      erpnextSupplierId: input.erpnextSupplierId,
      createdAt: now,
      updatedAt: now,
    };
    this.suppliers.set(this.getKey(input.merchantId, id), supplier);
    return supplier;
  }

  async update(
    merchantId: string,
    id: SupplierId,
    input: UpdateSupplierInput,
  ): Promise<Supplier> {
    const existing = await this.findById(merchantId, id);
    if (!existing) {
      throw new Error(`Supplier ${id} not found`);
    }
    const updated: Supplier = {
      ...existing,
      ...input,
      tags: input.tags ?? existing.tags,
      updatedAt: new Date(),
    };
    this.suppliers.set(this.getKey(merchantId, id), updated);
    return updated;
  }

  async recordTransaction(
    input: RecordSupplierTransactionInput,
  ): Promise<SupplierTransaction> {
    const supplier = await this.findById(input.merchantId, input.supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${input.supplierId} not found`);
    }

    let balanceDelta = 0n;
    if (input.transactionType === "purchase_credit" || input.transactionType === "advance") {
      balanceDelta = input.amountMinor;
    } else if (input.transactionType === "payment" || input.transactionType === "return") {
      balanceDelta = -input.amountMinor;
    } else {
      balanceDelta = input.amountMinor;
    }

    const newBalance = supplier.balanceMinor + balanceDelta;
    await this.update(input.merchantId, input.supplierId, { balanceMinor: newBalance } as any);

    const tx: SupplierTransaction = {
      id: crypto.randomUUID(),
      merchantId: input.merchantId,
      supplierId: input.supplierId,
      transactionType: input.transactionType,
      amountMinor: input.amountMinor,
      balanceAfterMinor: newBalance,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };

    this.transactions.push(tx);
    return tx;
  }

  async getTransactions(
    merchantId: string,
    supplierId: SupplierId,
    limit: number = 50,
    offset: number = 0,
  ): Promise<SupplierTransaction[]> {
    const list = this.transactions
      .filter((t) => t.merchantId === merchantId && t.supplierId === supplierId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list.slice(offset, offset + limit);
  }
}
