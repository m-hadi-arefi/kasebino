/**
 * Drizzle Tenant Integration Repository (ADR-093 / ADR-126 / Phase 1 / Phase 2).
 * Concrete DB persistence for tenant integrations and store warehouse mappings.
 */

import { eq, and } from "drizzle-orm";
import type { DrizzleDb } from "../../../../../infrastructure/database/drizzle/client.js";
import {
  erpnextTenantIntegrations,
  storeWarehouseMappings,
} from "../../../../../infrastructure/database/schema/integrations.js";
import type { TenantIntegrationRepository } from "./tenant-resolver.js";
import type { ProvisioningPersistencePort } from "./provisioning-service.js";

export class DrizzleTenantRepository
  implements TenantIntegrationRepository, ProvisioningPersistencePort
{
  constructor(private readonly db: DrizzleDb) {}

  async getTenantIntegration(merchantId: string) {
    const rows = await this.db
      .select()
      .from(erpnextTenantIntegrations)
      .where(eq(erpnextTenantIntegrations.merchantId, merchantId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      merchantId: row.merchantId,
      erpnextSiteUrl: row.erpnextSiteUrl,
      erpnextCompany: row.erpnextCompany,
      companyAbbr: row.companyAbbr,
      defaultWarehouse: row.defaultWarehouse,
      encryptedApiKey: row.encryptedApiKey,
      encryptedApiSecret: row.encryptedApiSecret,
      provisioningStatus: row.provisioningStatus,
      connectionStatus: row.connectionStatus,
    };
  }

  async getStoreWarehouse(merchantId: string, storeId: string) {
    const rows = await this.db
      .select()
      .from(storeWarehouseMappings)
      .where(
        and(
          eq(storeWarehouseMappings.merchantId, merchantId),
          eq(storeWarehouseMappings.storeId, storeId),
        ),
      )
      .limit(1);

    return rows[0]?.erpnextWarehouse ?? null;
  }

  async saveTenantIntegration(record: {
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
  }): Promise<void> {
    const now = new Date();
    const existing = await this.getTenantIntegration(record.merchantId);

    if (existing) {
      await this.db
        .update(erpnextTenantIntegrations)
        .set({
          erpnextSiteUrl: record.erpnextSiteUrl,
          erpnextCompany: record.erpnextCompany,
          companyAbbr: record.companyAbbr,
          defaultWarehouse: record.defaultWarehouse,
          encryptedApiKey: record.encryptedApiKey ?? null,
          encryptedApiSecret: record.encryptedApiSecret ?? null,
          provisioningStatus: record.provisioningStatus,
          connectionStatus: record.connectionStatus,
          lastErrorMessageFa: record.lastErrorMessageFa ?? null,
          lastErrorAt: record.lastErrorMessageFa ? now : undefined,
          updatedAt: now,
        })
        .where(eq(erpnextTenantIntegrations.merchantId, record.merchantId));
    } else {
      await this.db.insert(erpnextTenantIntegrations).values({
        merchantId: record.merchantId,
        erpnextSiteUrl: record.erpnextSiteUrl,
        erpnextCompany: record.erpnextCompany,
        companyAbbr: record.companyAbbr,
        defaultWarehouse: record.defaultWarehouse,
        encryptedApiKey: record.encryptedApiKey ?? null,
        encryptedApiSecret: record.encryptedApiSecret ?? null,
        provisioningStatus: record.provisioningStatus,
        connectionStatus: record.connectionStatus,
        lastErrorMessageFa: record.lastErrorMessageFa ?? null,
        lastErrorAt: record.lastErrorMessageFa ? now : null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async saveStoreWarehouseMapping(record: {
    merchantId: string;
    storeId: string;
    erpnextWarehouse: string;
  }): Promise<void> {
    const now = new Date();
    const existing = await this.getStoreWarehouse(
      record.merchantId,
      record.storeId,
    );

    if (existing) {
      await this.db
        .update(storeWarehouseMappings)
        .set({
          erpnextWarehouse: record.erpnextWarehouse,
          updatedAt: now,
        })
        .where(
          and(
            eq(storeWarehouseMappings.merchantId, record.merchantId),
            eq(storeWarehouseMappings.storeId, record.storeId),
          ),
        );
    } else {
      await this.db.insert(storeWarehouseMappings).values({
        id: crypto.randomUUID(),
        merchantId: record.merchantId,
        storeId: record.storeId,
        erpnextWarehouse: record.erpnextWarehouse,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
