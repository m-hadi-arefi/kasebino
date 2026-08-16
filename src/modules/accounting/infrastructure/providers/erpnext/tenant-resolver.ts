/**
 * ERPNext Tenant Resolver (ADR-126 / Phase 1 / Phase 5).
 * Resolves per-merchant company, credentials, site URL, and store warehouses.
 */

import type { ErpNextProviderConfig } from "./erpnext-config.js";
import { decryptSecret } from "./crypto-credentials.js";

export type TenantContext = {
  merchantId: string;
  erpnextSiteUrl: string;
  erpnextCompany: string;
  companyAbbr?: string | undefined;
  defaultWarehouse: string;
  storeWarehouse?: string | undefined;
  apiKey: string;
  apiSecret: string;
  provisioningStatus?: string | undefined;
  connectionStatus?: string | undefined;
  currency?: string | undefined;
  costCenter?: string | null | undefined;
};

export interface TenantIntegrationRepository {
  getTenantIntegration(merchantId: string): Promise<{
    merchantId: string;
    erpnextSiteUrl: string;
    erpnextCompany: string;
    companyAbbr: string;
    defaultWarehouse: string;
    encryptedApiKey: string | null;
    encryptedApiSecret: string | null;
    provisioningStatus: string;
    connectionStatus: string;
  } | null>;
  
  getStoreWarehouse(merchantId: string, storeId: string): Promise<string | null>;
}

export class ErpNextTenantResolver {
  constructor(
    private readonly repo?: TenantIntegrationRepository,
    private readonly globalFallbackConfig?: ErpNextProviderConfig,
  ) {}

  async resolveTenantContext(input: {
    merchantId: string;
    storeId?: string;
  }): Promise<TenantContext> {
    if (this.repo) {
      const integration = await this.repo.getTenantIntegration(input.merchantId);
      if (integration) {
        let storeWarehouse: string | undefined;
        if (input.storeId) {
          const mapped = await this.repo.getStoreWarehouse(input.merchantId, input.storeId);
          if (mapped) storeWarehouse = mapped;
        }

        return {
          merchantId: integration.merchantId,
          erpnextSiteUrl: integration.erpnextSiteUrl,
          erpnextCompany: integration.erpnextCompany,
          companyAbbr: integration.companyAbbr,
          defaultWarehouse: integration.defaultWarehouse,
          storeWarehouse: storeWarehouse || integration.defaultWarehouse,
          apiKey: integration.encryptedApiKey ? decryptSecret(integration.encryptedApiKey) : "",
          apiSecret: integration.encryptedApiSecret ? decryptSecret(integration.encryptedApiSecret) : "",
          provisioningStatus: integration.provisioningStatus,
          connectionStatus: integration.connectionStatus,
        };
      }
    }

    // Fallback to global config if tenant record is absent (backward compatibility for single-tenant mode)
    if (this.globalFallbackConfig) {
      return {
        merchantId: input.merchantId,
        erpnextSiteUrl: this.globalFallbackConfig.baseUrl,
        erpnextCompany: this.globalFallbackConfig.company,
        companyAbbr: "MD",
        defaultWarehouse: this.globalFallbackConfig.warehouse,
        storeWarehouse: this.globalFallbackConfig.warehouse,
        apiKey: this.globalFallbackConfig.apiKey,
        apiSecret: this.globalFallbackConfig.apiSecret,
        provisioningStatus: "READY",
        connectionStatus: "CONNECTED",
      };
    }

    throw new Error(`ERPNext tenant context not found for merchant ${input.merchantId}`);
  }
}
