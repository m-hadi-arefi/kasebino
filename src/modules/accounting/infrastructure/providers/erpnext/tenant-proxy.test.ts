import { describe, expect, it, vi } from "vitest";
import { encryptSecret, decryptSecret } from "./crypto-credentials.js";
import { ErpNextTenantResolver } from "./tenant-resolver.js";
import { ErpNextProvisioningService } from "./provisioning-service.js";
import { ErpNextReportsProvider } from "./reports-provider.js";
import type { ErpNextClient } from "./erpnext-client.js";

describe("ERPNext Multi-Tenant Proxy & Provisioning (ADR-126)", () => {
  it("encrypts and decrypts tenant API secrets with AES-256-GCM", () => {
    const rawSecret = "sec_abc123_super_secret_token";
    const encrypted = encryptSecret(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted).toContain(":");

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it("resolves tenant context for a merchant and store warehouse", async () => {
    const mockRepo = {
      getTenantIntegration: vi.fn().mockResolvedValue({
        merchantId: "merch-100",
        erpnextSiteUrl: "http://localhost:8080",
        erpnextCompany: "Kasbino Tejarat MD",
        companyAbbr: "KMD",
        defaultWarehouse: "Stores - KMD",
        encryptedApiKey: encryptSecret("key_123"),
        encryptedApiSecret: encryptSecret("sec_456"),
        provisioningStatus: "READY",
        connectionStatus: "CONNECTED",
      }),
      getStoreWarehouse: vi.fn().mockResolvedValue("Store Tehran - KMD"),
    };

    const resolver = new ErpNextTenantResolver(mockRepo);
    const tenant = await resolver.resolveTenantContext({
      merchantId: "merch-100",
      storeId: "store-tehran",
    });

    expect(tenant.merchantId).toBe("merch-100");
    expect(tenant.erpnextCompany).toBe("Kasbino Tejarat MD");
    expect(tenant.companyAbbr).toBe("KMD");
    expect(tenant.storeWarehouse).toBe("Store Tehran - KMD");
    expect(tenant.apiKey).toBe("key_123");
    expect(tenant.apiSecret).toBe("sec_456");
  });

  it("provisions ERPNext company & default warehouse idempotently", async () => {
    const mockClient = {
      getList: vi.fn().mockResolvedValue([]),
      createDoc: vi.fn().mockImplementation(async (doctype: string, doc: any) => ({
        name: doc.company_name || doc.warehouse_name || "DOC-001",
      })),
    } as unknown as ErpNextClient;

    const mockPersistence = {
      saveTenantIntegration: vi.fn().mockResolvedValue(undefined),
      saveStoreWarehouseMapping: vi.fn().mockResolvedValue(undefined),
    };

    const provisioning = new ErpNextProvisioningService(
      mockClient,
      mockPersistence,
      "http://localhost:8080",
    );

    const result = await provisioning.provisionCompany({
      merchantId: "merch-200",
      merchantName: "HyperStar Tehran",
      stores: [{ id: "store-1", name: "Branch 1" }],
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("READY");
    expect(result.companyName).toBe("HyperStar Tehran");
    expect(mockPersistence.saveTenantIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: "merch-200",
        erpnextCompany: "HyperStar Tehran",
        provisioningStatus: "READY",
      }),
    );
  });

  it("queries Chart of Accounts tree structure for tenant company", async () => {
    const mockClient = {
      getList: vi.fn().mockResolvedValue([
        { name: "Assets - MD", account_name: "دارایی‌ها", is_group: 1, root_type: "Asset" },
        { name: "Bank Accounts - MD", account_name: "حساب‌های بانکی", parent_account: "Assets - MD", is_group: 0, root_type: "Asset" },
      ]),
    } as unknown as ErpNextClient;

    const provider = new ErpNextReportsProvider();
    const tree = await provider.getChartOfAccounts(mockClient, {
      merchantId: "merch-1",
      erpnextSiteUrl: "http://localhost:8080",
      erpnextCompany: "MerchantOS Demo",
      companyAbbr: "MD",
      defaultWarehouse: "Stores - MD",
      apiKey: "k",
      apiSecret: "s",
      provisioningStatus: "READY",
      connectionStatus: "CONNECTED",
    });

    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe("Assets - MD");
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children?.[0]?.name).toBe("Bank Accounts - MD");
  });
});
