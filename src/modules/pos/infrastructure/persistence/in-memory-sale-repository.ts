import type { SaleRepository } from "../../domain/repositories.js";
import type { Sale } from "../../domain/sale.js";

export class InMemorySaleRepository implements SaleRepository {
  private readonly byId = new Map<string, Sale>();
  /** merchantId\0idempotencyKey → saleId */
  private readonly byIdempotency = new Map<string, string>();

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
}
