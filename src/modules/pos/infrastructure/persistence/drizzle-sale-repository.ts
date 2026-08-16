/**
 * Drizzle SaleRepository (ADR-093 / ADR-009).
 */

import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import type { DrizzleTransactionScope } from "../../../../infrastructure/persistence/drizzle-transaction-scope.js";
import {
  saleLines,
  sales,
} from "../../../../infrastructure/database/schema/sales.js";
import {
  assertMerchantId,
  assertStoreId,
  notDeleted,
} from "../../../../infrastructure/persistence/helpers.js";
import type { PosTenderType } from "../../../../pos-sales/index.js";
import type { SaleRepository } from "../../domain/repositories.js";
import type { Sale, SaleLine, SaleStatus } from "../../domain/sale.js";

type SaleRow = typeof sales.$inferSelect;
type LineRow = typeof saleLines.$inferSelect;

function toLine(row: LineRow): SaleLine {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    quantity: row.quantity,
    unitPriceMinor: row.unitPriceMinor,
    lineTotalMinor: row.lineTotalMinor,
  };
}

function toSale(row: SaleRow, lines: SaleLine[]): Sale {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    membershipId: row.membershipId,
    customerId: row.customerId,
    phoneNational: row.phoneNational,
    tenderType: row.tenderType as PosTenderType,
    payments: [{ amountMinor: row.totalAmountMinor, tenderType: row.tenderType as PosTenderType }],
    lines,
    totalAmountMinor: row.totalAmountMinor,
    status: row.status as SaleStatus,
    idempotencyKey: row.idempotencyKey,
    receiptObjectKey: row.receiptObjectKey,
    receiptContentType: row.receiptContentType,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export class DrizzleSaleRepository implements SaleRepository {
  constructor(
    private readonly dbOrScope: DrizzleDb | DrizzleTransactionScope,
  ) {}

  private get db(): DrizzleDb {
    return "executor" in this.dbOrScope
      ? this.dbOrScope.executor
      : this.dbOrScope;
  }

  private get inSharedTx(): boolean {
    return "isActive" in this.dbOrScope && this.dbOrScope.isActive;
  }

  private async loadLines(saleId: string): Promise<SaleLine[]> {
    const rows = await this.db
      .select()
      .from(saleLines)
      .where(eq(saleLines.saleId, saleId));
    return rows.map(toLine);
  }

  async save(sale: Sale): Promise<void> {
    const persist = async (tx: DrizzleDb) => {
      await tx.insert(sales).values({
        id: sale.id,
        merchantId: sale.merchantId,
        storeId: sale.storeId,
        membershipId: sale.membershipId,
        customerId: sale.customerId,
        phoneNational: sale.phoneNational,
        tenderType: sale.tenderType,
        totalAmountMinor: sale.totalAmountMinor,
        status: sale.status,
        idempotencyKey: sale.idempotencyKey,
        receiptObjectKey: sale.receiptObjectKey,
        receiptContentType: sale.receiptContentType,
        completedAt: sale.completedAt,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        deletedAt: sale.deletedAt,
      });
      if (sale.lines.length > 0) {
        await tx.insert(saleLines).values(
          sale.lines.map((line) => ({
            id: line.id || randomUUID(),
            saleId: sale.id,
            merchantId: sale.merchantId,
            storeId: sale.storeId,
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
            lineTotalMinor: line.lineTotalMinor,
            createdAt: sale.createdAt,
          })),
        );
      }
    };

    if (this.inSharedTx) {
      await persist(this.db);
      return;
    }
    await this.db.transaction(async (tx) => {
      await persist(tx as unknown as DrizzleDb);
    });
  }

  async findById(id: string): Promise<Sale | null> {
    const rows = await this.db
      .select()
      .from(sales)
      .where(and(eq(sales.id, id), notDeleted(sales.deletedAt)))
      .limit(1);
    if (!rows[0]) return null;
    const lines = await this.loadLines(id);
    return toSale(rows[0], lines);
  }

  async findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Sale | null> {
    assertMerchantId(merchantId);
    const rows = await this.db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.merchantId, merchantId),
          eq(sales.idempotencyKey, idempotencyKey),
          notDeleted(sales.deletedAt),
        ),
      )
      .limit(1);
    if (!rows[0]) return null;
    const lines = await this.loadLines(rows[0].id);
    return toSale(rows[0], lines);
  }

  async updateReceiptRef(
    saleId: string,
    input: { objectKey: string; contentType: string },
  ): Promise<void> {
    const id = saleId.trim();
    const objectKey = input.objectKey.trim();
    const contentType = input.contentType.trim();
    if (!id || !objectKey || !contentType) {
      throw new Error("updateReceiptRef requires saleId, objectKey, contentType (ADR-111).");
    }
    await this.db
      .update(sales)
      .set({
        receiptObjectKey: objectKey,
        receiptContentType: contentType,
        updatedAt: new Date(),
      })
      .where(and(eq(sales.id, id), notDeleted(sales.deletedAt)));
  }

  async listCompletedByMembershipId(membershipId: string): Promise<Sale[]> {
    const id = membershipId.trim();
    if (!id) return [];
    const rows = await this.db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.membershipId, id),
          eq(sales.status, "completed"),
          isNotNull(sales.completedAt),
          notDeleted(sales.deletedAt),
        ),
      )
      .orderBy(desc(sales.completedAt));
    const result: Sale[] = [];
    for (const row of rows) {
      const lines = await this.loadLines(row.id);
      result.push(toSale(row, lines));
    }
    return result;
  }

  async listCompletedByStoreId(storeId: string): Promise<Sale[]> {
    assertStoreId(storeId);
    const rows = await this.db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.storeId, storeId),
          eq(sales.status, "completed"),
          isNotNull(sales.completedAt),
          notDeleted(sales.deletedAt),
        ),
      )
      .orderBy(asc(sales.completedAt));
    const result: Sale[] = [];
    for (const row of rows) {
      const lines = await this.loadLines(row.id);
      result.push(toSale(row, lines));
    }
    return result;
  }

  async listCompletedByMerchantId(
    merchantId: string,
    opts: { storeId?: string | null } = {},
  ): Promise<Sale[]> {
    assertMerchantId(merchantId);
    const conditions = [
      eq(sales.merchantId, merchantId),
      eq(sales.status, "completed"),
      isNotNull(sales.completedAt),
      notDeleted(sales.deletedAt),
    ];
    if (opts.storeId) {
      conditions.push(eq(sales.storeId, opts.storeId));
    }
    const rows = await this.db
      .select()
      .from(sales)
      .where(and(...conditions))
      .orderBy(asc(sales.completedAt));
    const result: Sale[] = [];
    for (const row of rows) {
      const lines = await this.loadLines(row.id);
      result.push(toSale(row, lines));
    }
    return result;
  }
}
