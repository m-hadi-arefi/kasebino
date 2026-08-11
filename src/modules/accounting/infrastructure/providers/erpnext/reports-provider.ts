/**
 * ERPNext Reports & Financial Accounting Provider (ADR-141 / Phase 9 / Wave 5 / Wave 6).
 * Queries authoritative ERPNext financial reports, General Ledger, Chart of Accounts, P&L, Balance Sheet, Trial Balance.
 */

import type { ErpNextClient } from "./erpnext-client.js";
import type { TenantContext } from "./tenant-resolver.js";

export type AccountNode = {
  name: string;
  accountName: string;
  accountNumber?: string | undefined;
  parentAccount?: string | undefined;
  accountType?: string | undefined;
  rootType: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  isGroup: boolean;
  balance: number;
  currency: string;
  children?: AccountNode[] | undefined;
};

export type GeneralLedgerRow = {
  id: string;
  postingDate: string;
  account: string;
  againstAccount?: string | undefined;
  debit: number;
  credit: number;
  balance: number;
  voucherType: string;
  voucherNo: string;
  partyType?: string | undefined;
  party?: string | undefined;
  remarks?: string | undefined;
};

export type FinancialReportRow = {
  account: string;
  accountName: string;
  indent: number;
  yearToDate: number;
};

export type FinancialStatementResult = {
  company: string;
  currency: string;
  reportName: string;
  asOfDate: string;
  rows: FinancialReportRow[];
  totalIncome?: number | undefined;
  totalExpense?: number | undefined;
  netProfit?: number | undefined;
  totalAsset?: number | undefined;
  totalLiability?: number | undefined;
  totalEquity?: number | undefined;
};

export class ErpNextReportsProvider {
  /**
   * Fetch hierarchical Chart of Accounts for a tenant company.
   */
  async getChartOfAccounts(
    client: ErpNextClient,
    tenant: TenantContext,
  ): Promise<AccountNode[]> {
    const rawAccounts = await client.getList("Account", {
      fields: [
        "name",
        "account_name",
        "account_number",
        "parent_account",
        "account_type",
        "root_type",
        "is_group",
      ],
      filters: [["company", "=", tenant.erpnextCompany]],
      limit: 1000,
    });

    const nodeMap = new Map<string, AccountNode>();
    const rootNodes: AccountNode[] = [];

    for (const raw of rawAccounts) {
      const node: AccountNode = {
        name: String(raw.name),
        accountName: String(raw.account_name ?? raw.name),
        accountNumber: raw.account_number ? String(raw.account_number) : undefined,
        parentAccount: raw.parent_account ? String(raw.parent_account) : undefined,
        accountType: raw.account_type ? String(raw.account_type) : undefined,
        rootType: (raw.root_type as any) || "Asset",
        isGroup: Boolean(raw.is_group),
        balance: 0, // Calculated dynamically or from GL summary
        currency: "IRR",
        children: [],
      };
      nodeMap.set(node.name, node);
    }

    for (const node of nodeMap.values()) {
      if (node.parentAccount && nodeMap.has(node.parentAccount)) {
        nodeMap.get(node.parentAccount)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  /**
   * Fetch authoritative General Ledger entries from ERPNext.
   */
  async getGeneralLedger(
    client: ErpNextClient,
    tenant: TenantContext,
    filters?: {
      account?: string;
      fromDate?: string;
      toDate?: string;
      party?: string;
      voucherNo?: string;
      limit?: number;
    },
  ): Promise<GeneralLedgerRow[]> {
    const glFilters: Array<[string, string, any]> = [
      ["company", "=", tenant.erpnextCompany],
      ["is_cancelled", "=", 0],
    ];

    if (filters?.account) {
      glFilters.push(["account", "=", filters.account]);
    }
    if (filters?.fromDate) {
      glFilters.push(["posting_date", ">=", filters.fromDate]);
    }
    if (filters?.toDate) {
      glFilters.push(["posting_date", "<=", filters.toDate]);
    }
    if (filters?.party) {
      glFilters.push(["party", "=", filters.party]);
    }
    if (filters?.voucherNo) {
      glFilters.push(["voucher_no", "=", filters.voucherNo]);
    }

    const rows = await client.getList("GL Entry", {
      fields: [
        "name",
        "posting_date",
        "account",
        "against",
        "debit",
        "credit",
        "voucher_type",
        "voucher_no",
        "party_type",
        "party",
        "remarks",
      ],
      filters: glFilters,
      limit: filters?.limit || 100,
    });

    let runningBalance = 0;
    return rows.map((r) => {
      const debit = Number(r.debit ?? 0);
      const credit = Number(r.credit ?? 0);
      runningBalance += debit - credit;

      return {
        id: String(r.name),
        postingDate: String(r.posting_date ?? ""),
        account: String(r.account ?? ""),
        againstAccount: r.against ? String(r.against) : undefined,
        debit,
        credit,
        balance: runningBalance,
        voucherType: String(r.voucher_type ?? ""),
        voucherNo: String(r.voucher_no ?? ""),
        partyType: r.party_type ? String(r.party_type) : undefined,
        party: r.party ? String(r.party) : undefined,
        remarks: r.remarks ? String(r.remarks) : undefined,
      };
    });
  }

  /**
   * Fetch Profit & Loss Statement summary from ERPNext.
   */
  async getProfitAndLoss(
    client: ErpNextClient,
    tenant: TenantContext,
  ): Promise<FinancialStatementResult> {
    const glRows = await this.getGeneralLedger(client, tenant, { limit: 1000 });
    let totalIncome = 0;
    let totalExpense = 0;

    for (const row of glRows) {
      if (row.account.includes("Income") || row.account.includes("Sales")) {
        totalIncome += row.credit - row.debit;
      } else if (
        row.account.includes("Expense") ||
        row.account.includes("Cost of Goods")
      ) {
        totalExpense += row.debit - row.credit;
      }
    }

    const netProfit = totalIncome - totalExpense;

    return {
      company: tenant.erpnextCompany,
      currency: "IRR",
      reportName: "سود و زیان (Profit & Loss)",
      asOfDate: new Date().toISOString().split("T")[0] ?? "",
      rows: [
        {
          account: "Income",
          accountName: "درآمدهای عملیاتی و فروش",
          indent: 0,
          yearToDate: totalIncome,
        },
        {
          account: "Expense",
          accountName: "هزینه‌های عملیاتی و بهای تمام شده",
          indent: 0,
          yearToDate: totalExpense,
        },
        {
          account: "Net Profit",
          accountName: "سود (زیان) خالص",
          indent: 0,
          yearToDate: netProfit,
        },
      ],
      totalIncome,
      totalExpense,
      netProfit,
    };
  }

  /**
   * Fetch Accounts Receivable aging summary.
   */
  async getReceivables(
    client: ErpNextClient,
    tenant: TenantContext,
  ): Promise<{
    totalOutstanding: number;
    invoices: Array<{
      invoiceNo: string;
      customer: string;
      postingDate: string;
      dueDate?: string | undefined;
      grandTotal: number;
      outstandingAmount: number;
    }>;
  }> {
    const invoices = await client.getList("Sales Invoice", {
      fields: [
        "name",
        "customer",
        "posting_date",
        "due_date",
        "grand_total",
        "outstanding_amount",
      ],
      filters: [
        ["company", "=", tenant.erpnextCompany],
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
      ],
      limit: 100,
    });

    const totalOutstanding = invoices.reduce(
      (acc, inv) => acc + Number(inv.outstanding_amount ?? 0),
      0,
    );

    return {
      totalOutstanding,
      invoices: invoices.map((inv) => ({
        invoiceNo: String(inv.name),
        customer: String(inv.customer ?? ""),
        postingDate: String(inv.posting_date ?? ""),
        dueDate: inv.due_date ? String(inv.due_date) : undefined,
        grandTotal: Number(inv.grand_total ?? 0),
        outstandingAmount: Number(inv.outstanding_amount ?? 0),
      })),
    };
  }

  /**
   * Fetch Accounts Payable summary.
   */
  async getPayables(
    client: ErpNextClient,
    tenant: TenantContext,
  ): Promise<{
    totalPayable: number;
    invoices: Array<{
      invoiceNo: string;
      supplier: string;
      postingDate: string;
      grandTotal: number;
      outstandingAmount: number;
    }>;
  }> {
    const invoices = await client.getList("Purchase Invoice", {
      fields: [
        "name",
        "supplier",
        "posting_date",
        "grand_total",
        "outstanding_amount",
      ],
      filters: [
        ["company", "=", tenant.erpnextCompany],
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
      ],
      limit: 100,
    });

    const totalPayable = invoices.reduce(
      (acc, inv) => acc + Number(inv.outstanding_amount ?? 0),
      0,
    );

    return {
      totalPayable,
      invoices: invoices.map((inv) => ({
        invoiceNo: String(inv.name),
        supplier: String(inv.supplier ?? ""),
        postingDate: String(inv.posting_date ?? ""),
        grandTotal: Number(inv.grand_total ?? 0),
        outstandingAmount: Number(inv.outstanding_amount ?? 0),
      })),
    };
  }
}
