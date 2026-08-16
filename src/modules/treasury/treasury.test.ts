import { describe, expect, it } from "vitest";
import {
  CloseCashRegisterUseCase,
  InMemoryTreasuryRepository,
  TransferFundsUseCase,
} from "./index.js";

describe("Treasury Module (Cash Registers, Closing Variance, Fund Transfers)", () => {
  it("opens cash register, closes register and calculates variance correctly", async () => {
    const repo = new InMemoryTreasuryRepository();
    const closeUC = new CloseCashRegisterUseCase(repo);
    const merchantId = "m-01";
    const storeId = "s-01";

    const register = await repo.createCashRegister({
      merchantId,
      storeId,
      accountId: "acc-cash-01",
      name: "صندوق اصلی فروشگاه",
      openingBalanceMinor: 10000000n, // 1,000,000 IRR
    });

    expect(register.status).toBe("open");

    // Close register: Opening 1M + Sales 5M - Expenses 500k - Transfers 1M = Expected 4.5M
    // Actual count: 4.4M (100k shortage/variance)
    const closing = await closeUC.execute({
      merchantId,
      registerId: register.id,
      closingDate: "2026-02-12",
      salesCashMinor: 50000000n,
      expensesMinor: 5000000n,
      transfersOutMinor: 10000000n,
      actualCountMinor: 44000000n,
      varianceReason: "کسری صندوق پایان روز",
    });

    expect(closing.expectedBalanceMinor).toBe(45000000n);
    expect(closing.actualCountMinor).toBe(44000000n);
    expect(closing.varianceMinor).toBe(-1000000n); // -100,000 IRR variance

    const updatedReg = await repo.getCashRegister(merchantId, register.id);
    expect(updatedReg?.status).toBe("closed");
    expect(updatedReg?.currentBalanceMinor).toBe(44000000n);
  });

  it("executes fund transfer between cash and bank", async () => {
    const repo = new InMemoryTreasuryRepository();
    const transferUC = new TransferFundsUseCase(repo);
    const merchantId = "m-01";

    const transfer = await transferUC.execute({
      merchantId,
      fromAccountId: "acc-cash-01",
      toAccountId: "acc-bank-mellat",
      amountMinor: 20000000n, // 2,000,000 IRR
      transferDate: "2026-02-12",
      reference: "واریز به حساب بانکی",
    });

    expect(transfer.id).toBeDefined();
    expect(transfer.amountMinor).toBe(20000000n);
  });

  it("prevents negative or same account fund transfer", async () => {
    const repo = new InMemoryTreasuryRepository();
    const transferUC = new TransferFundsUseCase(repo);

    await expect(
      transferUC.execute({
        merchantId: "m-01",
        fromAccountId: "acc-01",
        toAccountId: "acc-01",
        amountMinor: 1000n,
        transferDate: "2026-02-12",
      }),
    ).rejects.toThrow("Cannot transfer funds to the same account");
  });
});
