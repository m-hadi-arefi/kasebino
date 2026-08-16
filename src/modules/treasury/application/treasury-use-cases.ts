/**
 * Treasury Application Use-Cases (MerchantOS Phase 3).
 */

import type {
  BankAccount,
  CashClosing,
  CashRegister,
  FundTransfer,
} from "../domain/treasury.js";

export interface TreasuryRepository {
  getCashRegister(merchantId: string, id: string): Promise<CashRegister | null>;
  listCashRegisters(merchantId: string, storeId?: string): Promise<CashRegister[]>;
  createCashRegister(input: {
    merchantId: string;
    storeId: string;
    accountId: string;
    name: string;
    openingBalanceMinor?: bigint;
    isDefault?: boolean;
  }): Promise<CashRegister>;
  updateRegisterBalance(merchantId: string, registerId: string, deltaMinor: bigint): Promise<CashRegister>;
  closeCashRegister(input: {
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
  }): Promise<CashClosing>;

  getBankAccount(merchantId: string, id: string): Promise<BankAccount | null>;
  listBankAccounts(merchantId: string): Promise<BankAccount[]>;
  createBankAccount(input: {
    merchantId: string;
    accountId: string;
    bankName: string;
    accountNumber?: string;
    iban?: string;
    cardNumber?: string;
    accountHolder?: string;
    isDefault?: boolean;
  }): Promise<BankAccount>;
  updateBankBalance(merchantId: string, bankAccountId: string, deltaMinor: bigint): Promise<BankAccount>;

  recordFundTransfer(input: {
    merchantId: string;
    fromAccountId: string;
    toAccountId: string;
    amountMinor: bigint;
    transferDate: string;
    reference?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<FundTransfer>;
}

export class CloseCashRegisterUseCase {
  constructor(private readonly repo: TreasuryRepository) {}

  async execute(input: {
    merchantId: string;
    registerId: string;
    closingDate: string;
    salesCashMinor: bigint;
    expensesMinor: bigint;
    transfersOutMinor: bigint;
    actualCountMinor: bigint;
    varianceReason?: string;
    closedBy?: string;
  }): Promise<CashClosing> {
    const register = await this.repo.getCashRegister(input.merchantId, input.registerId);
    if (!register) {
      throw new Error(`Cash register ${input.registerId} not found`);
    }

    const openingBalanceMinor = register.openingBalanceMinor;
    return this.repo.closeCashRegister({
      ...input,
      openingBalanceMinor,
    });
  }
}

export class TransferFundsUseCase {
  constructor(private readonly repo: TreasuryRepository) {}

  async execute(input: {
    merchantId: string;
    fromAccountId: string;
    toAccountId: string;
    amountMinor: bigint;
    transferDate: string;
    reference?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<FundTransfer> {
    if (input.amountMinor <= 0n) {
      throw new Error("Transfer amount must be positive");
    }
    if (input.fromAccountId === input.toAccountId) {
      throw new Error("Cannot transfer funds to the same account");
    }
    return this.repo.recordFundTransfer(input);
  }
}
