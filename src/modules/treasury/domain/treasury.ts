/**
 * Treasury Domain Types (MerchantOS Phase 3).
 */

export type CashRegisterId = string;
export type BankAccountId = string;

export type CashRegister = {
  readonly id: CashRegisterId;
  readonly merchantId: string;
  readonly storeId: string;
  readonly accountId: string;
  readonly name: string;
  readonly openingBalanceMinor: bigint;
  readonly currentBalanceMinor: bigint;
  readonly isDefault: boolean;
  readonly responsibleUserId?: string;
  readonly status: "open" | "closed";
  readonly lastClosedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CashClosing = {
  readonly id: string;
  readonly merchantId: string;
  readonly registerId: CashRegisterId;
  readonly closingDate: string;
  readonly openingBalanceMinor: bigint;
  readonly salesCashMinor: bigint;
  readonly expensesMinor: bigint;
  readonly transfersOutMinor: bigint;
  readonly expectedBalanceMinor: bigint;
  readonly actualCountMinor: bigint;
  readonly varianceMinor: bigint;
  readonly varianceReason?: string;
  readonly closedBy?: string;
  readonly createdAt: Date;
};

export type BankAccount = {
  readonly id: BankAccountId;
  readonly merchantId: string;
  readonly accountId: string;
  readonly bankName: string;
  readonly accountNumber?: string;
  readonly iban?: string;
  readonly cardNumber?: string;
  readonly accountHolder?: string;
  readonly currentBalanceMinor: bigint;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type FundTransfer = {
  readonly id: string;
  readonly merchantId: string;
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amountMinor: bigint;
  readonly transferDate: string;
  readonly reference?: string;
  readonly notes?: string;
  readonly transactionId?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
};
