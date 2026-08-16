/**
 * ERPNext provider env config (ADR-140).
 */

export type ErpNextProviderConfig = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  company: string;
  warehouse: string;
  costCenter: string | null;
  priceList: string | null;
  defaultCustomer: string;
  currency: string;
  timeoutMs: number;
  itemGroup: string;
  customerGroup: string;
  territory: string;
  incomeAccount: string | null;
  cashAccount: string | null;
  expenseAccount?: string | null | undefined;
  bankAccount?: string | null | undefined;
};

export class ErpNextConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErpNextConfigError";
  }
}

export function loadErpNextProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): ErpNextProviderConfig {
  const baseUrl = (env.MOS_ERPNEXT_URL ?? "").trim();
  const apiKey = (env.MOS_ERPNEXT_API_KEY ?? "").trim();
  const apiSecret = (env.MOS_ERPNEXT_API_SECRET ?? "").trim();
  const company = (env.MOS_ERPNEXT_COMPANY ?? "").trim();
  const warehouse = (env.MOS_ERPNEXT_WAREHOUSE ?? "").trim();

  const missing: string[] = [];
  if (!baseUrl) missing.push("MOS_ERPNEXT_URL");
  if (!apiKey) missing.push("MOS_ERPNEXT_API_KEY");
  if (!apiSecret) missing.push("MOS_ERPNEXT_API_SECRET");
  if (!company) missing.push("MOS_ERPNEXT_COMPANY");
  if (!warehouse) missing.push("MOS_ERPNEXT_WAREHOUSE");
  if (missing.length > 0) {
    throw new ErpNextConfigError(
      `ERPNext provider misconfigured; missing ${missing.join(", ")}`,
    );
  }

  const timeoutRaw = Number(env.MOS_ERPNEXT_TIMEOUT_MS ?? "30000");
  const timeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 30_000;

  return {
    baseUrl,
    apiKey,
    apiSecret,
    company,
    warehouse,
    costCenter: (env.MOS_ERPNEXT_COST_CENTER ?? "").trim() || null,
    priceList: (env.MOS_ERPNEXT_PRICE_LIST ?? "").trim() || null,
    defaultCustomer:
      (env.MOS_ERPNEXT_DEFAULT_CUSTOMER ?? "").trim() || "Cash Customer",
    currency: (env.MOS_ERPNEXT_CURRENCY ?? "IRR").trim() || "IRR",
    timeoutMs,
    itemGroup: (env.MOS_ERPNEXT_ITEM_GROUP ?? "Products").trim() || "Products",
    customerGroup:
      (env.MOS_ERPNEXT_CUSTOMER_GROUP ?? "Individual").trim() ||
      "Individual",
    territory:
      (env.MOS_ERPNEXT_TERRITORY ?? "All Territories").trim() || "All Territories",
    incomeAccount: (env.MOS_ERPNEXT_INCOME_ACCOUNT ?? "").trim() || null,
    cashAccount: (env.MOS_ERPNEXT_CASH_ACCOUNT ?? "").trim() || null,
  };
}
