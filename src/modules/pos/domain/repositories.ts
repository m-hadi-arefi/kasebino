import type { Sale } from "./sale.js";

export type SaleRepository = {
  save(sale: Sale): Promise<void>;
  findById(id: string): Promise<Sale | null>;
  findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Sale | null>;
};
