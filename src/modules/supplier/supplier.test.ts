import { describe, expect, it } from "vitest";
import {
  CreateSupplierUseCase,
  GetSupplierStatementUseCase,
  GetSupplierUseCase,
  InMemorySupplierRepository,
  UpdateSupplierUseCase,
} from "./index.js";
import { isMerchantOsUnitCode, requireUnit } from "../../shared/quantity/index.js";

describe("Supplier Module & Unit Extensions (Phase 1)", () => {
  it("supports extended retail unit codes (pack, carton, meter, liter, bottle, pair, dozen)", () => {
    expect(isMerchantOsUnitCode("pack")).toBe(true);
    expect(isMerchantOsUnitCode("carton")).toBe(true);
    expect(isMerchantOsUnitCode("meter")).toBe(true);
    expect(isMerchantOsUnitCode("liter")).toBe(true);

    const pack = requireUnit("pack");
    expect(pack.labelFa).toBe("بسته");
    expect(pack.scale).toBe(0);

    const liter = requireUnit("liter");
    expect(liter.labelFa).toBe("لیتر");
    expect(liter.scale).toBe(3);
  });

  it("creates, retrieves, and updates suppliers", async () => {
    const repo = new InMemorySupplierRepository();
    const createUC = new CreateSupplierUseCase(repo);
    const getUC = new GetSupplierUseCase(repo);
    const updateUC = new UpdateSupplierUseCase(repo);
    const merchantId = "m-test-01";

    const supplier = await createUC.execute({
      merchantId,
      name: "شرکت بازرگانی پارس",
      phone: "09121112233",
      contactName: "علی محمدی",
    });

    expect(supplier.id).toBeDefined();
    expect(supplier.name).toBe("شرکت بازرگانی پارس");
    expect(supplier.balanceMinor).toBe(0n);

    const fetched = await getUC.execute(merchantId, supplier.id);
    expect(fetched).toEqual(supplier);

    const updated = await updateUC.execute(merchantId, supplier.id, {
      city: "تهران",
      notes: "تأمین‌کننده اصلی لبنیات",
    });
    expect(updated.city).toBe("تهران");
    expect(updated.notes).toBe("تأمین‌کننده اصلی لبنیات");
  });

  it("prevents duplicate supplier phone numbers per merchant", async () => {
    const repo = new InMemorySupplierRepository();
    const createUC = new CreateSupplierUseCase(repo);
    const merchantId = "m-test-01";

    await createUC.execute({
      merchantId,
      name: "تأمین ۱",
      phone: "09120000000",
    });

    await expect(
      createUC.execute({
        merchantId,
        name: "تأمین ۲",
        phone: "09120000000",
      }),
    ).rejects.toThrow("already exists");
  });

  it("records supplier transactions and tracks AP balance statements correctly", async () => {
    const repo = new InMemorySupplierRepository();
    const createUC = new CreateSupplierUseCase(repo);
    const statementUC = new GetSupplierStatementUseCase(repo);
    const merchantId = "m-test-01";

    const supplier = await createUC.execute({
      merchantId,
      name: "پخش خزر",
    });

    // Record credit purchase: 15,000,000 IRR (we owe supplier)
    await repo.recordTransaction({
      merchantId,
      supplierId: supplier.id,
      transactionType: "purchase_credit",
      amountMinor: 15000000n,
      description: "فاکتور خرید ۱۰۱",
    });

    let statement = await statementUC.execute(merchantId, supplier.id);
    expect(statement.supplier.balanceMinor).toBe(15000000n);
    expect(statement.transactions.length).toBe(1);

    // Record payment: 5,000,000 IRR
    await repo.recordTransaction({
      merchantId,
      supplierId: supplier.id,
      transactionType: "payment",
      amountMinor: 5000000n,
      description: "پرداخت از صندوق",
    });

    statement = await statementUC.execute(merchantId, supplier.id);
    expect(statement.supplier.balanceMinor).toBe(10000000n);
    expect(statement.transactions.length).toBe(2);
  });
});
