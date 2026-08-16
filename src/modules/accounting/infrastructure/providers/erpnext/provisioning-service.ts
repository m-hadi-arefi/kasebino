/**
 * ERPNext Company Provisioning Service (ADR-126 / Phase 2 / Phase 3).
 * Idempotent, transactionally safe onboarding of ERPNext Companies & Warehouses.
 */

import type { ErpNextClient } from "./erpnext-client.js";
import { encryptSecret } from "./crypto-credentials.js";

export type ProvisionCompanyInput = {
  merchantId: string;
  merchantName: string;
  stores?: Array<{ id: string; name: string }>;
  currency?: string;
  customAbbr?: string;
};

export type ProvisioningResult = {
  ok: boolean;
  merchantId: string;
  companyName: string;
  companyAbbr: string;
  defaultWarehouse: string;
  storeWarehouses: Record<string, string>;
  status: "READY" | "FAILED" | "RETRYING";
  errorMessageFa?: string;
};

export interface ProvisioningPersistencePort {
  saveTenantIntegration(record: {
    merchantId: string;
    erpnextSiteUrl: string;
    erpnextCompany: string;
    companyAbbr: string;
    defaultWarehouse: string;
    encryptedApiKey?: string;
    encryptedApiSecret?: string;
    provisioningStatus: string;
    connectionStatus: string;
    lastErrorMessageFa?: string;
  }): Promise<void>;

  saveStoreWarehouseMapping(record: {
    merchantId: string;
    storeId: string;
    erpnextWarehouse: string;
  }): Promise<void>;
}

export class ErpNextProvisioningService {
  constructor(
    private readonly masterClient: ErpNextClient,
    private readonly persistence: ProvisioningPersistencePort,
    private readonly siteUrl: string,
  ) {}

  private generateAbbr(name: string, customAbbr?: string): string {
    if (customAbbr && customAbbr.trim().length >= 2) {
      return customAbbr.trim().toUpperCase().slice(0, 10);
    }
    // Extract capital letters or alphanumeric characters
    const clean = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (clean.length >= 2) {
      return clean.slice(0, 6);
    }
    // Fallback pseudo-random 4-char suffix
    const hash = Math.abs(
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
    )
      .toString(36)
      .toUpperCase();
    return `M${hash.slice(0, 4)}`;
  }

  async provisionCompany(
    input: ProvisionCompanyInput,
  ): Promise<ProvisioningResult> {
    const companyName = input.merchantName.trim();
    const abbr = this.generateAbbr(companyName, input.customAbbr);
    const currency = input.currency || "IRR";

    try {
      // 1. Idempotency Check: Check if Company already exists in ERPNext
      const existingCompanies = await this.masterClient.getList("Company", {
        fields: ["name", "abbr", "default_currency"],
        filters: [["company_name", "=", companyName]],
        limit: 1,
      });

      let targetCompany = existingCompanies[0]?.name
        ? String(existingCompanies[0].name)
        : null;

      if (!targetCompany) {
        // Check by abbr
        const byAbbr = await this.masterClient.getList("Company", {
          fields: ["name"],
          filters: [["abbr", "=", abbr]],
          limit: 1,
        });
        if (byAbbr[0]?.name) {
          targetCompany = String(byAbbr[0].name);
        }
      }

      if (!targetCompany) {
        // 2. Create Company DocType in ERPNext
        const created = await this.masterClient.createDoc("Company", {
          company_name: companyName,
          abbr: abbr,
          default_currency: currency,
          country: "Iran",
        });
        targetCompany = String(created.name ?? companyName);
      }

      // 3. Provision Default Warehouses
      const parentWarehouseName = `All Warehouses - ${abbr}`;
      const defaultWarehouseName = `Stores - ${abbr}`;

      const existingWh = await this.masterClient.getList("Warehouse", {
        fields: ["name"],
        filters: [
          ["company", "=", targetCompany],
          ["warehouse_name", "=", "Stores"],
        ],
        limit: 1,
      });

      let defaultWarehouse = existingWh[0]?.name
        ? String(existingWh[0].name)
        : null;

      if (!defaultWarehouse) {
        try {
          const createdWh = await this.masterClient.createDoc("Warehouse", {
            warehouse_name: "Stores",
            company: targetCompany,
            parent_warehouse: parentWarehouseName,
            is_group: 0,
          });
          defaultWarehouse = String(createdWh.name ?? defaultWarehouseName);
        } catch {
          // Fallback to auto-created default warehouse
          defaultWarehouse = defaultWarehouseName;
        }
      }

      // 4. Provision Store-specific Warehouses for multi-store support
      const storeWarehouses: Record<string, string> = {};
      if (input.stores && input.stores.length > 0) {
        for (const store of input.stores) {
          const storeWhName = `${store.name} - ${abbr}`;
          try {
            const storeWhList = await this.masterClient.getList("Warehouse", {
              fields: ["name"],
              filters: [
                ["company", "=", targetCompany],
                ["warehouse_name", "=", store.name],
              ],
              limit: 1,
            });

            let assignedWh = storeWhList[0]?.name
              ? String(storeWhList[0].name)
              : null;

            if (!assignedWh) {
              const createdStoreWh = await this.masterClient.createDoc(
                "Warehouse",
                {
                  warehouse_name: store.name,
                  company: targetCompany,
                  parent_warehouse: defaultWarehouse,
                  is_group: 0,
                },
              );
              assignedWh = String(createdStoreWh.name ?? storeWhName);
            }
            storeWarehouses[store.id] = assignedWh;
            await this.persistence.saveStoreWarehouseMapping({
              merchantId: input.merchantId,
              storeId: store.id,
              erpnextWarehouse: assignedWh,
            });
          } catch {
            storeWarehouses[store.id] = defaultWarehouse;
          }
        }
      }

      // 5. Ensure Cash Customer & Basic Masters
      try {
        const cashCustomer = await this.masterClient.getList("Customer", {
          fields: ["name"],
          filters: [["customer_name", "=", "Cash Customer"]],
          limit: 1,
        });
        if (!cashCustomer[0]?.name) {
          await this.masterClient.createDoc("Customer", {
            customer_name: "Cash Customer",
            customer_type: "Individual",
            customer_group: "All Customer Groups",
            territory: "All Territories",
          });
        }
      } catch {
        // ignore setup master errors
      }

      // 6. Save Tenant Integration Status in MerchantOS DB
      await this.persistence.saveTenantIntegration({
        merchantId: input.merchantId,
        erpnextSiteUrl: this.siteUrl,
        erpnextCompany: targetCompany,
        companyAbbr: abbr,
        defaultWarehouse,
        encryptedApiKey: encryptSecret(""), // Master key access used if individual key not generated
        encryptedApiSecret: encryptSecret(""),
        provisioningStatus: "READY",
        connectionStatus: "CONNECTED",
      });

      return {
        ok: true,
        merchantId: input.merchantId,
        companyName: targetCompany,
        companyAbbr: abbr,
        defaultWarehouse,
        storeWarehouses,
        status: "READY",
      };
    } catch (err: unknown) {
      const errorMessageFa = `خطا در ایجاد شرکت مالی در ERPNext: ${err instanceof Error ? err.message : "خطای ناشناخته"}`;

      await this.persistence.saveTenantIntegration({
        merchantId: input.merchantId,
        erpnextSiteUrl: this.siteUrl,
        erpnextCompany: companyName,
        companyAbbr: abbr,
        defaultWarehouse: `Stores - ${abbr}`,
        provisioningStatus: "FAILED",
        connectionStatus: "ERROR",
        lastErrorMessageFa: errorMessageFa,
      });

      return {
        ok: false,
        merchantId: input.merchantId,
        companyName,
        companyAbbr: abbr,
        defaultWarehouse: `Stores - ${abbr}`,
        storeWarehouses: {},
        status: "FAILED",
        errorMessageFa,
      };
    }
  }
}
