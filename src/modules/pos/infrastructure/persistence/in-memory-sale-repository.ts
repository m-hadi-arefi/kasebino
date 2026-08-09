import type { SaleRepository } from "../../domain/repositories.js";
import type { Sale } from "../../domain/sale.js";

function isCompletedActive(sale: Sale): boolean {
  return (
    sale.deletedAt === null &&
    sale.status === "completed" &&
    sale.completedAt !== null
  );
}

export class InMemorySaleRepository implements SaleRepository {
  private readonly byId = new Map<string, Sale>();
  /** merchantId\0idempotencyKey → saleId */
  private readonly byIdempotency = new Map<string, string>();

  /** Test helper — simulates TX rollback for UnitOfWork fixtures. */
  clear(): void {
    this.byId.clear();
    this.byIdempotency.clear();
  }

  async save(sale: Sale): Promise<void> {
    this.byId.set(sale.id, sale);
    this.byIdempotency.set(
      `${sale.merchantId}\0${sale.idempotencyKey}`,
      sale.id,
    );
  }

  async findById(id: string): Promise<Sale | null> {
    return this.byId.get(id) ?? null;
  }

  async findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Sale | null> {
    const id = this.byIdempotency.get(`${merchantId}\0${idempotencyKey}`);
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  async updateReceiptRef(
    saleId: string,
    input: { objectKey: string; contentType: string },
  ): Promise<void> {
    const sale = this.byId.get(saleId);
    if (!sale) return;
    sale.receiptObjectKey = input.objectKey.trim();
    sale.receiptContentType = input.contentType.trim();
    sale.updatedAt = new Date();
  }

  async listCompletedByMembershipId(membershipId: string): Promise<Sale[]> {
    return [...this.byId.values()]
      .filter(
        (s) => s.membershipId === membershipId && isCompletedActive(s),
      )
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
      );
  }

  async listCompletedByStoreId(storeId: string): Promise<Sale[]> {
    return [...this.byId.values()]
      .filter((s) => s.storeId === storeId && isCompletedActive(s))
      .sort(
        (a, b) =>
          (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
      );
  }

  async listCompletedByMerchantId(
    merchantId: string,
    opts: { storeId?: string | null } = {},
  ): Promise<Sale[]> {
    return [...this.byId.values()]
      .filter((s) => {
        if (s.merchantId !== merchantId || !isCompletedActive(s)) return false;
        if (opts.storeId && s.storeId !== opts.storeId) return false;
        return true;
      })
      .sort(
        (a, b) =>
          (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
      );
  }
}
