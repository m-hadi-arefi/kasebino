/**
 * In-Memory Treasury Repository Implementation (MerchantOS Phase 3).
 */

import { TreasuryRepository } from "../application/treasury-use-cases.js";
import { BankAccount, CashClosing, CashRegister, FundTransfer } from "../domain/treasury.js";

export class InMemoryTreasuryRepository implements TreasuryRepository {
  private registers = new Map<string, CashRegister>();
  private closings: CashClosing[] = [];
  private bankAccounts = new Map<string, BankAccount>();
  private transfers: FundTransfer[] = [];

  private getKey(merchantId: string, id: string): string {
    return `${merchantId}:${id}`;
  }

  async getCashRegister(merchantId: string, id: string): Promise<CashRegister | null> {
    return this.registers.get(this.getKey(merchantId, id)) ?? null;
  }

  async listCashRegisters(merchantId: string, storeId?: string): Promise<CashRegister[]> {
    let list = Array.from(this.registers.values()).filter((r) => r.merchantId === merchantId);
    if (storeId) {
      list = list.filter((r) => r.storeId === storeId);
    }
    return list;
  }

  async createCashRegister(input: {
    merchantId: string;
    storeId: string;
    accountId: string;
    name: string;
    openingBalanceMinor?: bigint;
    isDefault?: boolean;
  }): Promise<CashRegister> {
    const id = crypto.randomUUID();
    const now = new Date();
    const register: CashRegister = {
      id,
      merchantId: input.merchantId,
      storeId: input.storeId,
      accountId: input.accountId,
      name: input.name,
      openingBalanceMinor: input.openingBalanceMinor ?? 0n,
      currentBalanceMinor: input.openingBalanceMinor ?? 0n,
      isDefault: input.isDefault ?? false,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    this.registers.set(this.getKey(input.merchantId, id), register);
    return register;
  }

  async updateRegisterBalance(
    merchantId: string,
    registerId: string,
    deltaMinor: bigint,
  ): Promise<CashRegister> {
    const reg = await this.getCashRegister(merchantId, registerId);
    if (!reg) throw new Error(`Cash register ${registerId} not found`);
    const updated: CashRegister = {
      ...reg,
      currentBalanceMinor: reg.currentBalanceMinor + deltaMinor,
      updatedAt: new Date(),
    };
    this.registers.set(this.getKey(merchantId, registerId), updated);
    return updated;
  }

  async closeCashRegister(input: {
    merchantId: string;
    registerId: string;
    closingDate: string;
    openingBalanceMinor: bigint;
    salesCashMinor: bigint;
    expensesMinor: bigint;
    transfersOutMinor: bigint;
    actualCountMinor: bigint;
    varianceReason?: string;
    closedBy?: string;
  }): Promise<CashClosing> {
    const reg = await this.getCashRegister(input.merchantId, input.registerId);
    if (!reg) throw new Error(`Cash register ${input.registerId} not found`);

    const expectedBalanceMinor =
      input.openingBalanceMinor +
      input.salesCashMinor -
      input.expensesMinor -
      input.transfersOutMinor;
    const varianceMinor = input.actualCountMinor - expectedBalanceMinor;

    const closing: CashClosing = {
      id: crypto.randomUUID(),
      merchantId: input.merchantId,
      registerId: input.registerId,
      closingDate: input.closingDate,
      openingBalanceMinor: input.openingBalanceMinor,
      salesCashMinor: input.salesCashMinor,
      expensesMinor: input.expensesMinor,
      transfersOutMinor: input.transfersOutMinor,
      expectedBalanceMinor,
      actualCountMinor: input.actualCountMinor,
      varianceMinor,
      varianceReason: input.varianceReason,
      closedBy: input.closedBy,
      createdAt: new Date(),
    };

    this.closings.push(closing);

    // Update register status
    const updated: CashRegister = {
      ...reg,
      currentBalanceMinor: input.actualCountMinor,
      status: "closed",
      lastClosedAt: closing.createdAt,
      updatedAt: new Date(),
    };
    this.registers.set(this.getKey(input.merchantId, input.registerId), updated);

    return closing;
  }

  async getBankAccount(merchantId: string, id: string): Promise<BankAccount | null> {
    return this.bankAccounts.get(this.getKey(merchantId, id)) ?? null;
  }

  async listBankAccounts(merchantId: string): Promise<BankAccount[]> {
    return Array.from(this.bankAccounts.values()).filter((b) => b.merchantId === merchantId);
  }

  async createBankAccount(input: {
    merchantId: string;
    accountId: string;
    bankName: string;
    accountNumber?: string;
    iban?: string;
    cardNumber?: string;
    accountHolder?: string;
    isDefault?: boolean;
  }): Promise<BankAccount> {
    const id = crypto.randomUUID();
    const now = new Date();
    const bank: BankAccount = {
      id,
      merchantId: input.merchantId,
      accountId: input.accountId,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      iban: input.iban,
      cardNumber: input.cardNumber,
      accountHolder: input.accountHolder,
      currentBalanceMinor: 0n,
      isDefault: input.isDefault ?? false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.bankAccounts.set(this.getKey(input.merchantId, id), bank);
    return bank;
  }

  async updateBankBalance(
    merchantId: string,
    bankAccountId: string,
    deltaMinor: bigint,
  ): Promise<BankAccount> {
    const bank = await this.getBankAccount(merchantId, bankAccountId);
    if (!bank) throw new Error(`Bank account ${bankAccountId} not found`);
    const updated: BankAccount = {
      ...bank,
      currentBalanceMinor: bank.currentBalanceMinor + deltaMinor,
      updatedAt: new Date(),
    };
    this.bankAccounts.set(this.getKey(merchantId, bankAccountId), updated);
    return updated;
  }

  async recordFundTransfer(input: {
    merchantId: string;
    fromAccountId: string;
    toAccountId: string;
    amountMinor: bigint;
    transferDate: string;
    reference?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<FundTransfer> {
    const transfer: FundTransfer = {
      id: crypto.randomUUID(),
      merchantId: input.merchantId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amountMinor: input.amountMinor,
      transferDate: input.transferDate,
      reference: input.reference,
      notes: input.notes,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };
    this.transfers.push(transfer);
    return transfer;
  }
}
