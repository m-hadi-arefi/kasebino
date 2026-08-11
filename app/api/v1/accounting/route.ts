import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

export async function GET(request: Request) {
  const session = await auth();
  if (!isMerchantSession(session)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", messageFa: "دسترسی غیرمجاز است" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "dashboard";

  if (action === "dashboard") {
    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          source: "erpnext",
          asOf: new Date().toISOString(),
          todaySales: { amountMinor: "150000000", displayToman: "15,000,000 تومان" },
          monthRevenue: { amountMinor: "12500000000", displayToman: "1,250,000,000 تومان" },
          receivables: { amountMinor: "3500000000", displayToman: "350,000,000 تومان" },
          payables: { amountMinor: "1200000000", displayToman: "120,000,000 تومان" },
          profitOverview: { amountMinor: "8300000000", displayToman: "830,000,000 تومان" },
          invoiceCountSynced: 42,
          paymentCountSynced: 38,
          pendingSyncCount: 0,
          failedSyncCount: 0,
        },
      },
    });
  }

  if (action === "chart-of-accounts") {
    return NextResponse.json({
      ok: true,
      data: {
        company: "MerchantOS Demo",
        accounts: [
          {
            name: "Application of Funds (Assets) - MD",
            accountName: "دارایی‌ها (Assets)",
            rootType: "Asset",
            isGroup: true,
            balance: 850000000,
            currency: "IRR",
            children: [
              {
                name: "Current Assets - MD",
                accountName: "دارایی‌های جاری",
                rootType: "Asset",
                isGroup: true,
                balance: 550000000,
                currency: "IRR",
                children: [
                  {
                    name: "Bank Accounts - MD",
                    accountName: "حساب‌های بانکی",
                    rootType: "Asset",
                    isGroup: false,
                    balance: 350000000,
                    currency: "IRR",
                  },
                  {
                    name: "Cash In Hand - MD",
                    accountName: "صندوق و وجوه نقد",
                    rootType: "Asset",
                    isGroup: false,
                    balance: 200000000,
                    currency: "IRR",
                  },
                ],
              },
            ],
          },
          {
            name: "Source of Funds (Liabilities) - MD",
            accountName: "بدهی‌ها (Liabilities)",
            rootType: "Liability",
            isGroup: true,
            balance: 120000000,
            currency: "IRR",
            children: [
              {
                name: "Accounts Payable - MD",
                accountName: "حساب‌های پرداختنی (تامین‌کنندگان)",
                rootType: "Liability",
                isGroup: false,
                balance: 120000000,
                currency: "IRR",
              },
            ],
          },
          {
            name: "Income - MD",
            accountName: "درآمدها (Income)",
            rootType: "Income",
            isGroup: true,
            balance: 1250000000,
            currency: "IRR",
            children: [
              {
                name: "Sales - MD",
                accountName: "فروش کالا و خدمات",
                rootType: "Income",
                isGroup: false,
                balance: 1250000000,
                currency: "IRR",
              },
            ],
          },
        ],
      },
    });
  }

  if (action === "general-ledger") {
    return NextResponse.json({
      ok: true,
      data: {
        entries: [
          {
            id: "GL-001",
            postingDate: new Date().toISOString().split("T")[0],
            account: "Sales - MD",
            againstAccount: "Cash In Hand - MD",
            debit: 0,
            credit: 15000000,
            balance: 15000000,
            voucherType: "Sales Invoice",
            voucherNo: "ACC-SINV-2026-00001",
            remarks: "فروش حضوری صندوق POS",
          },
          {
            id: "GL-002",
            postingDate: new Date().toISOString().split("T")[0],
            account: "Cash In Hand - MD",
            againstAccount: "Sales - MD",
            debit: 15000000,
            credit: 0,
            balance: 15000000,
            voucherType: "Payment Entry",
            voucherNo: "ACC-PAY-2026-00001",
            remarks: "دریافت وجه فاکتور فروش",
          },
        ],
      },
    });
  }

  if (action === "reports/profit-and-loss") {
    return NextResponse.json({
      ok: true,
      data: {
        company: "MerchantOS Demo",
        currency: "IRR",
        asOfDate: new Date().toISOString().split("T")[0],
        totalIncome: 1250000000,
        totalExpense: 420000000,
        netProfit: 830000000,
      },
    });
  }

  if (action === "integrity") {
    return NextResponse.json({
      ok: true,
      data: {
        status: "HEALTHY",
        syncHealthPercent: 100,
        pendingEvents: 0,
        failedEvents: 0,
        mismatches: [],
        lastCheckedAt: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json(
    { ok: false, error: "NOT_FOUND", messageFa: "عملیات نامعتبر است" },
    { status: 404 },
  );
}
