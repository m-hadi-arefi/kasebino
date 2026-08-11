/**
 * ERPNext Connection Manager (ADR-126 / Phase 1 / Phase 5 / Phase 13).
 * Instantiates and caches tenant-aware Frappe REST clients.
 */

import {
  createErpNextClient,
  createErpNextFetch,
  type ErpNextClient,
} from "./erpnext-client.js";
import type { TenantContext } from "./tenant-resolver.js";

export class ErpNextConnectionManager {
  private readonly clientCache = new Map<string, { client: ErpNextClient; expiresAt: number }>();

  constructor(private readonly fetchImpl?: typeof fetch) {}

  getClientForTenant(tenant: TenantContext): ErpNextClient {
    const cacheKey = `${tenant.merchantId}:${tenant.erpnextSiteUrl}:${tenant.apiKey}`;
    const now = Date.now();
    const cached = this.clientCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.client;
    }

    const fetchClient = createErpNextFetch({
      baseUrl: tenant.erpnextSiteUrl,
      apiKey: tenant.apiKey,
      apiSecret: tenant.apiSecret,
      timeoutMs: 30000,
      ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {}),
    });

    const client = createErpNextClient(fetchClient);
    // Cache client for 15 minutes
    this.clientCache.set(cacheKey, { client, expiresAt: now + 15 * 60 * 1000 });
    return client;
  }
}
