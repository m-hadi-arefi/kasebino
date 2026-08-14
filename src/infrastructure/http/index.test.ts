/**
 * ADR-094 / ADR-113 — contract tests for critical HTTP /api/v1 handlers.
 * Covers: Zod validation envelope, POS sale, storefront catalog, admin suspend, RBAC.
 */

import { describe, expect, it } from "vitest";

import {
  assertErrorEnvelopeShape,
  type ApiErrorEnvelope,
} from "../../api-standards/index.js";
import { ADMIN_DOMAIN_DECISION } from "../../admin-domain/index.js";
import { createInMemoryRateLimiter } from "../../rate-limiting/index.js";
import { createAdminUser } from "../../modules/admin/domain/index.js";
import {
  createAdminAuditPortStub,
  InMemoryAdminActionRepository,
  InMemoryAdminUserRepository,
} from "../../modules/admin/infrastructure/index.js";
import { createRecordingSecurityMonitoringPort } from "../../modules/admin/application/ports.js";
import {
  createCatalogUseCases,
} from "../../modules/catalog/application/use-cases.js";
import {
  InMemoryCategoryRepository,
  InMemoryProductRepository,
} from "../../modules/catalog/infrastructure/index.js";
import { InMemoryStoreMembershipRepository } from "../../modules/crm/infrastructure/index.js";
import {
  InMemoryStockItemRepository,
  InMemoryStockMovementRepository,
} from "../../modules/inventory/infrastructure/index.js";
import {
  InMemoryPointRuleRepository,
  InMemoryPointsLedgerRepository,
  InMemoryWalletRepository,
} from "../../modules/loyalty/infrastructure/index.js";
import { InMemoryMerchantRepository } from "../../modules/merchant/infrastructure/index.js";
import { InMemoryNotificationRepository } from "../../modules/notifications/infrastructure/index.js";
import { InMemoryOrderRepository } from "../../modules/ordering/infrastructure/index.js";
import { InMemoryPaymentRepository } from "../../modules/payments/infrastructure/index.js";
import { InMemorySaleRepository } from "../../modules/pos/infrastructure/index.js";
import { InMemoryStoreRepository } from "../../modules/store/infrastructure/index.js";
import {
  createApiContext,
  type ApiContext,
} from "../composition/create-api-context.js";
import type { AuthSessionSnapshot } from "../auth/session-guard.js";
import {
  handleAdminListAudit,
  handleAdminSuspendMerchant,
  handleAnalyticsOverview,
  handleAnalyticsRetention,
  handleCompleteSale,
  handleCreateProduct,
  handleDeleteProduct,
  handleDeleteProductImage,
  handleGetStoreQr,
  handleListStockMovements,
  handlePaymentWebhook,
  handleRefundPayment,
  handleSandboxConfirmPayment,
  handleStorefrontCreateOrder,
  handleStorefrontProducts,
  handleStorefrontProfile,
  handleStorefrontStaticMap,
  handleUpdateStore,
  handleUploadProductImage,
  isHttpBinaryResult,
  parseBody,
} from "./index.js";
import { z } from "zod";
import { correlationIdFrom, fail } from "./envelopes.js";
import type { AdminAuditStub } from "../../modules/admin/infrastructure/audit/audit-port-stub.js";
import { InMemoryCustomerIdentityRepository } from "../../modules/customer-identity/infrastructure/index.js";
import { createCustomerIdentity } from "../../modules/customer-identity/domain/index.js";
import { InMemoryOutboxStore } from "../../outbox/index.js";
import { signSandboxWebhook } from "../../modules/payments/application/index.js";

const PERSIAN = /[\u0600-\u06FF]/;

function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): {
  method: string;
  url: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
} {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(headers ?? {})) {
    map.set(k.toLowerCase(), v);
  }
  const payload = body === undefined ? "" : JSON.stringify(body);
  return {
    method,
    url,
    headers: {
      get(name: string) {
        return map.get(name.toLowerCase()) ?? null;
      },
    },
    async json() {
      if (!payload) throw new Error("no body");
      return JSON.parse(payload) as unknown;
    },
    async text() {
      return payload;
    },
  };
}

function createTestContext(): {
  ctx: ApiContext;
  merchants: InMemoryMerchantRepository;
  stores: InMemoryStoreRepository;
  products: InMemoryProductRepository;
  adminUsers: InMemoryAdminUserRepository;
  audit: AdminAuditStub;
} {
  const merchants = new InMemoryMerchantRepository();
  const stores = new InMemoryStoreRepository();
  const products = new InMemoryProductRepository();
  const categories = new InMemoryCategoryRepository();
  const stockItems = new InMemoryStockItemRepository();
  const stockMovements = new InMemoryStockMovementRepository();
  const storeMemberships = new InMemoryStoreMembershipRepository();
  const sales = new InMemorySaleRepository();
  const pointRules = new InMemoryPointRuleRepository();
  const wallets = new InMemoryWalletRepository();
  const pointsLedger = new InMemoryPointsLedgerRepository();
  const orders = new InMemoryOrderRepository();
  const payments = new InMemoryPaymentRepository();
  const notifications = new InMemoryNotificationRepository();
  const adminUsers = new InMemoryAdminUserRepository();
  const adminActions = new InMemoryAdminActionRepository();
  const { limiter } = createInMemoryRateLimiter("test");
  const audit = createAdminAuditPortStub();

  const ctx = createApiContext({
    repos: {
      merchants,
      stores,
      products,
      categories,
      stockItems,
      stockMovements,
      storeMemberships,
      sales,
      pointRules,
      wallets,
      pointsLedger,
      orders,
      payments,
      notifications,
      adminUsers,
      adminActions,
    },
    rateLimiter: limiter,
    rateLimitMode: "injected",
    audit: audit.port,
    auditStore: audit.store,
    securityMonitoring: createRecordingSecurityMonitoringPort(),
  });

  return { ctx, merchants, stores, products, adminUsers, audit };
}

function merchantSession(merchantId: string): AuthSessionSnapshot {
  return {
    audience: "merchant",
    merchantId,
    roles: ["merchant_owner"],
    user: {
      id: "user-1",
      merchantId,
      roles: ["merchant_owner"],
      audience: "merchant",
    },
  };
}

function employeeSession(
  merchantId: string,
  storeId: string,
): AuthSessionSnapshot {
  return {
    audience: "merchant",
    merchantId,
    storeId,
    roles: ["store_employee"],
    user: {
      id: "emp-1",
      merchantId,
      storeId,
      roles: ["store_employee"],
      audience: "merchant",
    },
  };
}

function adminSession(adminId: string): AuthSessionSnapshot {
  return {
    audience: "merchant",
    roles: ["platform_admin"],
    user: {
      id: adminId,
      roles: ["platform_admin"],
      audience: "merchant",
    },
  };
}

function errorMessage(body: unknown): string {
  const envelope = body as ApiErrorEnvelope;
  return envelope.error.message;
}

describe("ADR-094 HTTP /api/v1 contracts", () => {
  it("Zod failures return VALIDATION_ERROR envelope with correlationId + Persian message", async () => {
    const req = jsonRequest(
      "POST",
      "http://localhost/api/v1/catalog/products",
      { name: 123 },
      { "x-correlation-id": "corr-validation-1" },
    );
    const schema = z.object({ name: z.string() });
    const parsed = await parseBody(req, schema, correlationIdFrom(req));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.result.status).toBe(400);
    expect(parsed.result.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        correlationId: "corr-validation-1",
      },
    });
    assertErrorEnvelopeShape(
      parsed.result.body as ApiErrorEnvelope,
    );
  });

  it("missing Idempotency-Key on POS sale returns IDEMPOTENCY_KEY_REQUIRED", async () => {
    const { ctx } = createTestContext();
    const created = await ctx.merchants.createMerchant({
      tradeName: "مغازه کلید",
      slug: "idem-key-shop",
      ownerUserId: "user-1",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
    const result = await handleCompleteSale(
      jsonRequest("POST", "http://localhost/api/v1/pos/sales", {
        storeId: "s1",
        phone: "09123456789",
        tenderType: "cash",
        lines: [
          {
            productId: "p1",
            productName: "نان",
            quantity: 1,
            unitPriceMinor: 1000,
          },
        ],
      }),
      ctx,
      merchantSession(created.merchant.id),
    );
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      error: { code: "IDEMPOTENCY_KEY_REQUIRED" },
    });
    assertErrorEnvelopeShape(
      result.body as ApiErrorEnvelope,
    );
  });

  it("completes POS sale with session merchantId (ignores body merchant mismatch)", async () => {
    const { ctx } = createTestContext();
    const created = await ctx.merchants.createMerchant({
      tradeName: "نانوایی تست",
      slug: "bakery-test",
      ownerUserId: "user-1",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
    const store = await ctx.stores.createStore({
      merchantId: created.merchant.id,
      slug: "bakery-main",
      displayName: "شعبه اصلی",
      address: {
        line1: "خیابان ولیعصر",
        city: "تهران",
        province: "تهران",
        latitude: 35.7,
        longitude: 51.4,
      },
    });

    // seed stock via adjust
    const product = await ctx.catalog.createProduct({
      merchantId: created.merchant.id,
      name: "نان سنگک",
      sku: "nan-1",
      barcode: "1234567890123",
      priceAmountMinor: 50_000n,
    });
    await ctx.inventory.adjustStock({
      merchantId: created.merchant.id,
      storeId: store.store.id,
      productId: product.product.id,
      delta: 10,
    });

    const result = await handleCompleteSale(
      jsonRequest(
        "POST",
        "http://localhost/api/v1/pos/sales",
        {
          merchantId: "other-merchant",
          storeId: store.store.id,
          phone: "09121234567",
          tenderType: "cash",
          lines: [
            {
              productId: product.product.id,
              productName: product.product.name,
              quantity: 1,
              unitPriceMinor: "50000",
            },
          ],
        },
        {
          "Idempotency-Key": "sale-key-1",
          "x-correlation-id": "corr-sale-1",
        },
      ),
      ctx,
      merchantSession(created.merchant.id),
    );

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: "FORBIDDEN", correlationId: "corr-sale-1" },
    });
    expect(PERSIAN.test(errorMessage(result.body))).toBe(true);

    const okSale = await handleCompleteSale(
      jsonRequest(
        "POST",
        "http://localhost/api/v1/pos/sales",
        {
          storeId: store.store.id,
          phone: "09121234567",
          tenderType: "cash",
          lines: [
            {
              productId: product.product.id,
              productName: product.product.name,
              quantity: 1,
              unitPriceMinor: "50000",
            },
          ],
        },
        { "Idempotency-Key": "sale-key-2" },
      ),
      ctx,
      merchantSession(created.merchant.id),
    );
    expect(okSale.status).toBe(201);
    expect(okSale.body).toMatchObject({
      data: {
        created: true,
        sale: {
          merchantId: created.merchant.id,
          storeId: store.store.id,
        },
      },
    });
  });

  it("storefront catalog strips sensitive fields and lists active products", async () => {
    const { ctx } = createTestContext();
    const created = await ctx.merchants.createMerchant({
      tradeName: "قصابی رضایی",
      slug: "rezaei",
      ownerUserId: "owner-1",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
    const store = await ctx.stores.createStore({
      merchantId: created.merchant.id,
      slug: "rezaei-vanak",
      displayName: "قصابی رضایی ونک",
      address: {
        line1: "ونک",
        city: "تهران",
        province: "تهران",
        latitude: 35.75,
        longitude: 51.41,
      },
    });
    await ctx.catalog.createProduct({
      merchantId: created.merchant.id,
      name: "گوشت گوساله",
      sku: "beef-1",
      barcode: "9990001112223",
      priceAmountMinor: 2_500_000n,
    });

    const result = await handleStorefrontProducts(
      jsonRequest(
        "GET",
        `http://localhost/api/v1/storefront/${store.store.slug}/products`,
      ),
      ctx,
      store.store.slug,
    );
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: {
        products: [
          {
            name: "گوشت گوساله",
            priceDisplayToman: expect.any(String),
          },
        ],
      },
    });
    const json = JSON.stringify(result.body);
    expect(json).not.toMatch(/cost/i);
    expect(json).not.toMatch(/deletedAt/);
    expect(json).not.toMatch(/merchantId/);
  });

  it("admin suspend requires platform_admin and suspends merchant", async () => {
    const { ctx, adminUsers } = createTestContext();
    const admin = createAdminUser({
      id: "admin-1",
      login: "ops@kasbino.ir",
      displayName: "مدیر",
    });
    await adminUsers.save(admin);

    const created = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه هدف",
      slug: "target-shop",
      ownerUserId: "owner-2",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });

    const denied = await handleAdminSuspendMerchant(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/admin/merchants/${created.merchant.id}/suspend`,
        { reasonFa: "تخلف" },
        { "x-correlation-id": "corr-admin-1" },
      ),
      ctx,
      merchantSession(created.merchant.id),
      created.merchant.id,
    );
    expect(denied.status).toBe(403);
    expect(PERSIAN.test(errorMessage(denied.body))).toBe(true);

    const suspended = await handleAdminSuspendMerchant(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/admin/merchants/${created.merchant.id}/suspend`,
        { reason: "policy", reasonFa: "تخطی از قوانین" },
        { "x-correlation-id": "corr-admin-2" },
      ),
      ctx,
      adminSession(admin.id),
      created.merchant.id,
    );
    expect(suspended.status).toBe(200);
    expect(suspended.body).toMatchObject({
      data: {
        merchant: { id: created.merchant.id, status: "suspended" },
      },
    });
  });

  it("admin suspend writes audit event for merchant.suspend", async () => {
    const { ctx, adminUsers, audit } = createTestContext();
    const admin = createAdminUser({
      id: "admin-audit-1",
      login: "audit@kasbino.ir",
      displayName: "ممیزی",
    });
    await adminUsers.save(admin);

    const created = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه ممیزی",
      slug: "audit-shop",
      ownerUserId: "owner-audit",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });

    const suspended = await handleAdminSuspendMerchant(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/admin/merchants/${created.merchant.id}/suspend`,
        { reasonFa: "تخلف جدی" },
      ),
      ctx,
      adminSession(admin.id),
      created.merchant.id,
    );
    expect(suspended.status).toBe(200);

    const rows = await audit.store.search({
      merchantId: created.merchant.id,
      action: ADMIN_DOMAIN_DECISION.auditActions.suspend,
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.action.includes("suspend"))).toBe(true);
    expect(rows[0]?.merchantId).toBe(created.merchant.id);
  });

  it("create product rejects unauthenticated caller with Persian message", async () => {
    const { ctx } = createTestContext();
    const result = await handleCreateProduct(
      jsonRequest("POST", "http://localhost/api/v1/catalog/products", {
        name: "شیر",
        sku: "milk",
        barcode: "111",
        priceAmountMinor: 1000,
      }),
      ctx,
      null,
    );
    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    expect(PERSIAN.test(errorMessage(result.body))).toBe(true);
  });

  it("cross-tenant product access returns 404; body merchant mismatch returns 403 Persian", async () => {
    const { ctx } = createTestContext();
    const merchantA = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه الف",
      slug: "merchant-a",
      ownerUserId: "owner-a",
    });
    await ctx.merchants.activateMerchant({ merchantId: merchantA.merchant.id });
    const merchantB = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه ب",
      slug: "merchant-b",
      ownerUserId: "owner-b",
    });
    await ctx.merchants.activateMerchant({ merchantId: merchantB.merchant.id });

    const productB = await ctx.catalog.createProduct({
      merchantId: merchantB.merchant.id,
      name: "کالا ب",
      sku: "b-1",
      barcode: "2223334445556",
      priceAmountMinor: 10_000n,
    });

    const deleted = await handleDeleteProduct(
      jsonRequest(
        "DELETE",
        `http://localhost/api/v1/catalog/products/${productB.product.id}`,
      ),
      ctx,
      merchantSession(merchantA.merchant.id),
      productB.product.id,
    );
    expect(deleted.status).toBe(404);

    const mismatched = await handleCreateProduct(
      jsonRequest("POST", "http://localhost/api/v1/catalog/products", {
        name: "کالا نو",
        sku: "new-1",
        barcode: "3334445556667",
        priceAmountMinor: 2000,
        merchantId: merchantB.merchant.id,
      }),
      ctx,
      merchantSession(merchantA.merchant.id),
    );
    expect(mismatched.status).toBe(403);
    expect(mismatched.body).toMatchObject({ error: { code: "FORBIDDEN" } });
    expect(PERSIAN.test(errorMessage(mismatched.body))).toBe(true);
  });

  it("store_employee cannot create product (merchant.write) — 403 Persian", async () => {
    const { ctx } = createTestContext();
    const created = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه کارمند",
      slug: "emp-shop",
      ownerUserId: "owner-emp",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
    const store = await ctx.stores.createStore({
      merchantId: created.merchant.id,
      slug: "emp-main",
      displayName: "شعبه کارمند",
      address: {
        line1: "انقلاب",
        city: "تهران",
        province: "تهران",
        latitude: 35.7,
        longitude: 51.4,
      },
    });

    const result = await handleCreateProduct(
      jsonRequest("POST", "http://localhost/api/v1/catalog/products", {
        name: "چای",
        sku: "tea-1",
        barcode: "4445556667778",
        priceAmountMinor: 5000,
      }),
      ctx,
      employeeSession(created.merchant.id, store.store.id),
    );
    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ error: { code: "FORBIDDEN" } });
    expect(PERSIAN.test(errorMessage(result.body))).toBe(true);
  });

  it("fail() always includes Persian message", () => {
    const envelope = fail({
      code: "VALIDATION_ERROR",
      correlationId: "c1",
      status: 400,
    }).body;
    assertErrorEnvelopeShape(envelope as ApiErrorEnvelope);
    expect(PERSIAN.test(errorMessage(envelope))).toBe(true);

    const unauthorized = fail({
      code: "UNAUTHORIZED",
      correlationId: "c2",
      status: 401,
    }).body;
    expect(PERSIAN.test(errorMessage(unauthorized))).toBe(true);

    const forbidden = fail({
      code: "FORBIDDEN",
      correlationId: "c3",
      status: 403,
    }).body;
    expect(PERSIAN.test(errorMessage(forbidden))).toBe(true);
  });

  it("storefront pickup checkout creates pending_payment order + payment intent", async () => {
    const merchants = new InMemoryMerchantRepository();
    const stores = new InMemoryStoreRepository();
    const products = new InMemoryProductRepository();
    const categories = new InMemoryCategoryRepository();
    const stockItems = new InMemoryStockItemRepository();
    const storeMemberships = new InMemoryStoreMembershipRepository();
    const sales = new InMemorySaleRepository();
    const pointRules = new InMemoryPointRuleRepository();
    const wallets = new InMemoryWalletRepository();
    const pointsLedger = new InMemoryPointsLedgerRepository();
    const orders = new InMemoryOrderRepository();
    const payments = new InMemoryPaymentRepository();
    const notifications = new InMemoryNotificationRepository();
    const adminUsers = new InMemoryAdminUserRepository();
    const adminActions = new InMemoryAdminActionRepository();
    const customerIdentities = new InMemoryCustomerIdentityRepository();
    const outbox = new InMemoryOutboxStore();
    const { limiter } = createInMemoryRateLimiter("test-sf");
    const audit = createAdminAuditPortStub();

    const ctx = createApiContext({
      repos: {
        merchants,
        stores,
        products,
        categories,
        stockItems,
        storeMemberships,
        sales,
        pointRules,
        wallets,
        pointsLedger,
        orders,
        payments,
        notifications,
        adminUsers,
        adminActions,
        customerIdentities,
      },
      rateLimiter: limiter,
      rateLimitMode: "injected",
      outbox,
      audit: audit.port,
      securityMonitoring: createRecordingSecurityMonitoringPort(),
    });

    const created = await ctx.merchants.createMerchant({
      tradeName: "لبنیات نور",
      slug: "noor",
      ownerUserId: "owner-sf",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
    const store = await ctx.stores.createStore({
      merchantId: created.merchant.id,
      slug: "noor-kerman",
      displayName: "لبنیات نور کرمان",
      address: {
        line1: "خیابان شریعتی",
        city: "کرمان",
        province: "کرمان",
        latitude: 30.28,
        longitude: 57.08,
      },
    });
    const product = await ctx.catalog.createProduct({
      merchantId: created.merchant.id,
      name: "ماست چکیده",
      sku: "yogurt-1",
      barcode: "6260001999001",
      priceAmountMinor: 80_000n,
    });
    await ctx.inventory.adjustStock({
      merchantId: created.merchant.id,
      storeId: store.store.id,
      productId: product.product.id,
      delta: 5,
      reason: "seed",
    });

    await customerIdentities.save(
      createCustomerIdentity({
        id: "cust-1",
        phoneNational: "09121234567",
        phoneE164: "+989121234567",
      }),
    );

    const unauthorized = await handleStorefrontCreateOrder(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/storefront/${store.store.slug}/orders`,
        {
          lines: [{ productId: product.product.id, quantity: 1 }],
          consentCheckboxAccepted: true,
        },
        { "Idempotency-Key": "sf-order-1" },
      ),
      ctx,
      null,
      store.store.slug,
    );
    expect(unauthorized.status).toBe(401);

    const oos = await handleStorefrontCreateOrder(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/storefront/${store.store.slug}/orders`,
        {
          lines: [{ productId: product.product.id, quantity: 99 }],
          consentCheckboxAccepted: true,
        },
        { "Idempotency-Key": "sf-order-oos" },
      ),
      ctx,
      {
        audience: "customer",
        storeId: store.store.id,
        role: "customer",
        user: {
          id: "cust-1",
          storeId: store.store.id,
          audience: "customer",
          role: "customer",
        },
      },
      store.store.slug,
    );
    expect(oos.status).toBe(409);
    expect(oos.body).toMatchObject({ error: { code: "INSUFFICIENT_STOCK" } });
    expect(PERSIAN.test(errorMessage(oos.body))).toBe(true);

    const okOrder = await handleStorefrontCreateOrder(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/storefront/${store.store.slug}/orders`,
        {
          lines: [{ productId: product.product.id, quantity: 2 }],
          consentCheckboxAccepted: true,
        },
        { "Idempotency-Key": "sf-order-ok" },
      ),
      ctx,
      {
        audience: "customer",
        storeId: store.store.id,
        role: "customer",
        user: {
          id: "cust-1",
          storeId: store.store.id,
          audience: "customer",
          role: "customer",
        },
      },
      store.store.slug,
    );
    expect(okOrder.status).toBe(201);
    expect(okOrder.body).toMatchObject({
      data: {
        fulfillment: { mode: "pickup" },
        order: {
          status: "pending_payment",
          fulfillmentMode: "pickup",
        },
        payment: {
          orderId: expect.any(String),
        },
      },
    });
    const payload = JSON.stringify(okOrder.body);
    expect(payload).not.toMatch(/delivery/i);
    expect(payload).toMatch(/تومان/);

    const pending = await outbox.pollPending(10);
    expect(
      pending.some((m) => m.envelope.eventType === "OrderCreated"),
    ).toBe(true);

    const catalog = await handleStorefrontProducts(
      jsonRequest(
        "GET",
        `http://localhost/api/v1/storefront/${store.store.slug}/products`,
      ),
      ctx,
      store.store.slug,
    );
    expect(catalog.body).toMatchObject({
      data: {
        products: [
          expect.objectContaining({
            availableQuantity: 5,
            inStock: true,
          }),
        ],
      },
    });
  });
});

describe("ADR-102 payments HTTP + sandbox PSP path", () => {
  async function seedPickupOrderWithPayment() {
    const outbox = new InMemoryOutboxStore();
    const merchants = new InMemoryMerchantRepository();
    const stores = new InMemoryStoreRepository();
    const products = new InMemoryProductRepository();
    const categories = new InMemoryCategoryRepository();
    const stockItems = new InMemoryStockItemRepository();
    const storeMemberships = new InMemoryStoreMembershipRepository();
    const sales = new InMemorySaleRepository();
    const pointRules = new InMemoryPointRuleRepository();
    const wallets = new InMemoryWalletRepository();
    const pointsLedger = new InMemoryPointsLedgerRepository();
    const orders = new InMemoryOrderRepository();
    const payments = new InMemoryPaymentRepository();
    const notifications = new InMemoryNotificationRepository();
    const adminUsers = new InMemoryAdminUserRepository();
    const adminActions = new InMemoryAdminActionRepository();
    const customerIdentities = new InMemoryCustomerIdentityRepository();
    const { limiter } = createInMemoryRateLimiter("test-pay");
    const audit = createAdminAuditPortStub();

    const ctx = createApiContext({
      repos: {
        merchants,
        stores,
        products,
        categories,
        stockItems,
        storeMemberships,
        sales,
        pointRules,
        wallets,
        pointsLedger,
        orders,
        payments,
        notifications,
        adminUsers,
        adminActions,
        customerIdentities,
      },
      rateLimiter: limiter,
      rateLimitMode: "injected",
      outbox,
      audit: audit.port,
      securityMonitoring: createRecordingSecurityMonitoringPort(),
    });

    const created = await ctx.merchants.createMerchant({
      tradeName: "نانوایی آزمون",
      slug: "nan-pay",
      ownerUserId: "owner-pay",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
    const store = await ctx.stores.createStore({
      merchantId: created.merchant.id,
      slug: "nan-pay-kerman",
      displayName: "نان کرمان",
      address: {
        line1: "بازار",
        city: "کرمان",
        province: "کرمان",
        latitude: 30.28,
        longitude: 57.08,
      },
    });
    const product = await ctx.catalog.createProduct({
      merchantId: created.merchant.id,
      name: "نان بربری",
      sku: "nan-1",
      barcode: "6260001999111",
      priceAmountMinor: 50_000n,
    });
    await ctx.inventory.adjustStock({
      merchantId: created.merchant.id,
      storeId: store.store.id,
      productId: product.product.id,
      delta: 10,
      reason: "seed",
    });
    await customerIdentities.save(
      createCustomerIdentity({
        id: "cust-pay",
        phoneNational: "09121234567",
        phoneE164: "+989121234567",
      }),
    );

    const createdOrder = await handleStorefrontCreateOrder(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/storefront/${store.store.slug}/orders`,
        {
          lines: [{ productId: product.product.id, quantity: 1 }],
          consentCheckboxAccepted: true,
        },
        { "Idempotency-Key": "pay-e2e-1" },
      ),
      ctx,
      {
        audience: "customer",
        storeId: store.store.id,
        role: "customer",
        user: {
          id: "cust-pay",
          storeId: store.store.id,
          audience: "customer",
          role: "customer",
        },
      },
      store.store.slug,
    );
    expect(createdOrder.status).toBe(201);

    const body = createdOrder.body as {
      data: {
        payment: {
          id: string;
          amountDisplayToman: string;
          providerRef: string | null;
        };
        order: { id: string; status: string };
      };
    };

    return {
      ctx,
      outbox,
      merchant: created.merchant,
      store: store.store,
      paymentId: body.data.payment.id,
      orderId: body.data.order.id,
      providerRef: body.data.payment.providerRef ?? `sandbox-${body.data.payment.id}`,
      amountDisplayToman: body.data.payment.amountDisplayToman,
      orders,
      payments,
    };
  }

  it("sandbox confirm moves pickup order to paid with تومان DTO", async () => {
    const seeded = await seedPickupOrderWithPayment();
    expect(seeded.amountDisplayToman).toMatch(/تومان/);

    const confirmed = await handleSandboxConfirmPayment(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/payments/${seeded.paymentId}/sandbox/confirm`,
        { outcome: "succeeded" },
      ),
      seeded.ctx,
      seeded.paymentId,
      {
        MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM: "1",
        MOS_ENV: "local",
        NODE_ENV: "test",
      },
    );

    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toMatchObject({
      data: {
        confirmed: true,
        payment: { status: "succeeded", id: seeded.paymentId },
        order: { status: "paid", id: seeded.orderId },
      },
    });

    const order = await seeded.orders.findById(seeded.orderId);
    expect(order?.status).toBe("paid");

    const pending = await seeded.outbox.pollPending(20);
    expect(pending.some((m) => m.envelope.eventType === "OrderPaid")).toBe(
      true,
    );
    expect(
      pending.some((m) => m.envelope.eventType === "PaymentSucceeded"),
    ).toBe(true);
  });

  it("rejects invalid webhook signature with Persian message", async () => {
    const seeded = await seedPickupOrderWithPayment();
    const payload = {
      paymentId: seeded.paymentId,
      providerRef: seeded.providerRef,
      outcome: "succeeded" as const,
    };
    const raw = JSON.stringify(payload);
    const bad = await handlePaymentWebhook(
      {
        ...jsonRequest(
          "POST",
          "http://localhost/api/v1/payments/webhooks/sandbox",
          payload,
          { "x-signature": "00".repeat(32) },
        ),
        async text() {
          return raw;
        },
      },
      seeded.ctx,
      "sandbox",
    );
    expect(bad.status).toBe(401);
    expect(errorMessage(bad.body)).toMatch(/[\u0600-\u06FF]/);
    expect((bad.body as ApiErrorEnvelope).error.code).toBe(
      "WEBHOOK_SIGNATURE_INVALID",
    );
  });

  it("verified webhook is idempotent and marks order paid", async () => {
    const seeded = await seedPickupOrderWithPayment();
    const payload = {
      paymentId: seeded.paymentId,
      providerRef: seeded.providerRef,
      outcome: "succeeded" as const,
    };
    const raw = JSON.stringify(payload);
    const sig = signSandboxWebhook(raw);
    const req = () => ({
      ...jsonRequest(
        "POST",
        "http://localhost/api/v1/payments/webhooks/sandbox",
        payload,
        { "x-signature": sig },
      ),
      async text() {
        return raw;
      },
    });

    const first = await handlePaymentWebhook(req(), seeded.ctx, "sandbox");
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      data: { confirmed: true, order: { status: "paid" } },
    });

    const second = await handlePaymentWebhook(req(), seeded.ctx, "sandbox");
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({
      data: {
        confirmed: true,
        alreadyProcessed: true,
        payment: { status: "succeeded" },
        order: { status: "paid" },
      },
    });
  });

  it("refund updates payment + order", async () => {
    const seeded = await seedPickupOrderWithPayment();
    await handleSandboxConfirmPayment(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/payments/${seeded.paymentId}/sandbox/confirm`,
        {},
      ),
      seeded.ctx,
      seeded.paymentId,
      {
        MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM: "1",
        MOS_ENV: "local",
        NODE_ENV: "test",
      },
    );

    const refunded = await handleRefundPayment(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/payments/${seeded.paymentId}/refunds`,
        {},
      ),
      seeded.ctx,
      merchantSession(seeded.merchant.id),
      seeded.paymentId,
    );
    expect(refunded.status).toBe(200);
    expect(refunded.body).toMatchObject({
      data: {
        payment: { status: "refunded" },
        order: { status: "refunded" },
      },
    });
  });

  it("blocks sandbox confirm outside local/dev gate", async () => {
    const seeded = await seedPickupOrderWithPayment();
    const blocked = await handleSandboxConfirmPayment(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/payments/${seeded.paymentId}/sandbox/confirm`,
        {},
      ),
      seeded.ctx,
      seeded.paymentId,
      {
        MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM: "1",
        MOS_ENV: "production",
        NODE_ENV: "production",
      },
    );
    expect(blocked.status).toBe(403);
    expect((blocked.body as ApiErrorEnvelope).error.code).toBe(
      "SANDBOX_CONFIRM_FORBIDDEN",
    );
  });
});

describe("ADR-104 store location map + QR HTTP", () => {
  it("public profile includes map navigate DTOs and map fallback", async () => {
    const { ctx } = createTestContext();
    const created = await ctx.merchants.createMerchant({
      tradeName: "مغازه نقشه",
      slug: "map-merchant",
      ownerUserId: "user-map",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
    await ctx.stores.createStore({
      merchantId: created.merchant.id,
      slug: "map-shop",
      displayName: "نقشه کرمان",
      address: {
        line1: "خیابان شریعتی",
        city: "کرمان",
        province: "کرمان",
        latitude: 30.2839,
        longitude: 57.0834,
      },
    });

    const profile = await handleStorefrontProfile(
      jsonRequest("GET", "http://localhost/api/v1/storefront/map-shop"),
      ctx,
      "map-shop",
    );
    expect(profile.status).toBe(200);
    const store = (
      profile.body as {
        data: {
          store: {
            map: {
              available: boolean;
              fallbackReason: string;
              navigate: { neshan: string };
              navigateItems: Array<{ provider: string; labelFa: string }>;
            };
          };
        };
      }
    ).data.store;
    expect(store.map.available).toBe(false);
    expect(store.map.fallbackReason).toBe("provider_unconfigured");
    expect(store.map.navigate.neshan).toMatch(/neshan/i);
    expect(store.map.navigateItems[0]?.provider).toBe("neshan");
    expect(store.map.navigateItems[0]?.labelFa).toMatch(/نشان/);

    const missingMap = await handleStorefrontStaticMap(
      jsonRequest(
        "GET",
        "http://localhost/api/v1/storefront/map-shop/static-map",
      ),
      ctx,
      "map-shop",
    );
    expect(isHttpBinaryResult(missingMap)).toBe(false);
    if (!isHttpBinaryResult(missingMap)) {
      expect(missingMap.status).toBe(404);
      expect((missingMap.body as ApiErrorEnvelope).error.code).toBe(
        "MAP_PROVIDER_UNCONFIGURED",
      );
      expect(
        PERSIAN.test((missingMap.body as ApiErrorEnvelope).error.message ?? ""),
      ).toBe(true);
    }
  });

  it("returns PNG QR for owning merchant and forbids foreign tenant", async () => {
    const { ctx } = createTestContext();
    const a = await ctx.merchants.createMerchant({
      tradeName: "الف",
      slug: "qr-a",
      ownerUserId: "ua",
    });
    await ctx.merchants.activateMerchant({ merchantId: a.merchant.id });
    const store = await ctx.stores.createStore({
      merchantId: a.merchant.id,
      slug: "qr-shop",
      displayName: "فروشگاه QR",
      address: {
        line1: "خیابان ۱",
        city: "کرمان",
        province: "کرمان",
        latitude: 30.28,
        longitude: 57.08,
      },
    });
    const b = await ctx.merchants.createMerchant({
      tradeName: "ب",
      slug: "qr-b",
      ownerUserId: "ub",
    });
    await ctx.merchants.activateMerchant({ merchantId: b.merchant.id });

    const png = await handleGetStoreQr(
      {
        method: "GET",
        url: `http://localhost/api/v1/stores/${store.store.id}/qr`,
        headers: {
          get(name: string) {
            return name.toLowerCase() === "accept" ? "image/png" : null;
          },
        },
        json: async () => ({}),
        text: async () => "",
      },
      ctx,
      merchantSession(a.merchant.id),
      store.store.id,
    );
    expect(isHttpBinaryResult(png)).toBe(true);
    if (isHttpBinaryResult(png)) {
      expect(png.status).toBe(200);
      expect(png.headers["Content-Type"]).toBe("image/png");
      expect(png.body.byteLength).toBeGreaterThan(100);
      expect(png.headers["X-Mos-Qr-Target"]).toMatch(/\/s\/qr-shop\?src=qr/);
    }

    const foreign = await handleGetStoreQr(
      {
        method: "GET",
        url: `http://localhost/api/v1/stores/${store.store.id}/qr`,
        headers: {
          get(name: string) {
            return name.toLowerCase() === "accept" ? "image/png" : null;
          },
        },
        json: async () => ({}),
        text: async () => "",
      },
      ctx,
      merchantSession(b.merchant.id),
      store.store.id,
    );
    expect(isHttpBinaryResult(foreign)).toBe(false);
    if (!isHttpBinaryResult(foreign)) {
      expect([403, 404]).toContain(foreign.status);
    }
  });

  it("ADR-106: suspend blocks next POS authZ; analytics + audit stay live", async () => {
    const { ctx, adminUsers } = createTestContext();
    const admin = createAdminUser({
      id: "admin-106",
      login: "admin106@kasbino.ir",
      displayName: "مدیر",
    });
    await adminUsers.save(admin);

    const created = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه داشبورد",
      slug: "dash-shop",
      ownerUserId: "user-106",
    });
    await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
    const store = await ctx.stores.createStore({
      merchantId: created.merchant.id,
      slug: "dash-main",
      displayName: "شعبه",
      address: {
        line1: "کرمان",
        city: "کرمان",
        province: "کرمان",
        latitude: 30.2,
        longitude: 57.0,
      },
    });
    const product = await ctx.catalog.createProduct({
      merchantId: created.merchant.id,
      name: "چای",
      sku: "tea-1",
      barcode: "9990001112223",
      priceAmountMinor: 20_000n,
    });
    await ctx.inventory.adjustStock({
      merchantId: created.merchant.id,
      storeId: store.store.id,
      productId: product.product.id,
      delta: 5,
    });

    const sale = await handleCompleteSale(
      jsonRequest(
        "POST",
        "http://localhost/api/v1/pos/sales",
        {
          storeId: store.store.id,
          phone: "09121112233",
          tenderType: "cash",
          lines: [
            {
              productId: product.product.id,
              productName: product.product.name,
              quantity: 1,
              unitPriceMinor: "20000",
            },
          ],
        },
        { "Idempotency-Key": "adr106-sale-1" },
      ),
      ctx,
      merchantSession(created.merchant.id),
    );
    expect(sale.status).toBe(201);

    const overview = await handleAnalyticsOverview(
      {
        method: "GET",
        url: "http://localhost/api/v1/analytics/merchant/overview",
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "",
      },
      ctx,
      merchantSession(created.merchant.id),
    );
    expect(overview.status).toBe(200);
    expect(overview.body).toMatchObject({
      data: { overview: { salesCount: 1 } },
    });

    const retention = await handleAnalyticsRetention(
      {
        method: "GET",
        url: "http://localhost/api/v1/analytics/merchant/retention",
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "",
      },
      ctx,
      merchantSession(created.merchant.id),
    );
    expect(retention.status).toBe(200);
    expect(retention.body).toMatchObject({
      data: {
        retention: {
          monthlyReturningCustomers: expect.any(Number),
        },
      },
    });

    const suspended = await handleAdminSuspendMerchant(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/admin/merchants/${created.merchant.id}/suspend`,
        { reasonFa: "آزمایش تعلیق" },
      ),
      ctx,
      adminSession(admin.id),
      created.merchant.id,
    );
    expect(suspended.status).toBe(200);

    const blocked = await handleCompleteSale(
      jsonRequest(
        "POST",
        "http://localhost/api/v1/pos/sales",
        {
          storeId: store.store.id,
          phone: "09121112233",
          tenderType: "cash",
          lines: [
            {
              productId: product.product.id,
              productName: product.product.name,
              quantity: 1,
              unitPriceMinor: "20000",
            },
          ],
        },
        { "Idempotency-Key": "adr106-sale-blocked" },
      ),
      ctx,
      merchantSession(created.merchant.id),
    );
    expect(blocked.status).toBe(403);
    expect(PERSIAN.test(errorMessage(blocked.body))).toBe(true);

    const audit = await handleAdminListAudit(
      {
        method: "GET",
        url: "http://localhost/api/v1/admin/audit",
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "",
      },
      ctx,
      adminSession(admin.id),
    );
    expect(audit.status).toBe(200);
    const actions = (audit.body as { data?: { actions?: unknown[] } }).data
      ?.actions;
    expect(Array.isArray(actions)).toBe(true);
    expect((actions?.length ?? 0) > 0).toBe(true);
  });

  it("ADR-147: handleUploadProductImage uploads image via HTTP and handleDeleteProductImage clears it", async () => {
    const { InMemoryObjectStorageAdapter } = await import("../../minio-storage/index.js");
    const objectStorage = new InMemoryObjectStorageAdapter();

    const { ctx } = createTestContext();
    ctx.catalog = createCatalogUseCases({
      products: ctx.repos.products,
      categories: ctx.repos.categories,
      objectStorage,
    });

    const merchant = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه عکس",
      slug: "img-shop",
      ownerUserId: "user-img",
    });
    await ctx.merchants.activateMerchant({ merchantId: merchant.merchant.id });

    const created = await ctx.catalog.createProduct({
      merchantId: merchant.merchant.id,
      name: "محصول عکاسی",
      sku: "SKU-HTTP-IMG",
      barcode: "6260009998881",
      priceAmountMinor: 100_000,
    });

    const session = merchantSession(merchant.merchant.id);

    const base64Data = Buffer.from([137, 80, 78, 71]).toString("base64");
    const uploadRes = await handleUploadProductImage(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/catalog/products/${created.product.id}/image`,
        {
          dataBase64: base64Data,
          contentType: "image/png",
        },
      ),
      ctx,
      session,
      created.product.id,
    );

    expect(uploadRes.status).toBe(200);
    const body = uploadRes.body as { data: { product: { imageObjectKey: string }; objectKey: string } };
    expect(body.data.product.imageObjectKey).toMatch(/m\/m1|catalog|media/);

    const deleteRes = await handleDeleteProductImage(
      jsonRequest(
        "DELETE",
        `http://localhost/api/v1/catalog/products/${created.product.id}/image`,
      ),
      ctx,
      session,
      created.product.id,
    );

    expect(deleteRes.status).toBe(200);
    const delBody = deleteRes.body as { data: { product: { imageObjectKey: string | null } } };
    expect(delBody.data.product.imageObjectKey).toBeNull();
  });

  it("ADR-148: handleListStockMovements returns Persian reason display and stock movement history", async () => {
    const { ctx } = createTestContext();
    const merchant = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه انبار",
      slug: "inv-history-shop",
      ownerUserId: "user-inv",
    });
    await ctx.merchants.activateMerchant({ merchantId: merchant.merchant.id });

    await ctx.inventory.adjustStock({
      merchantId: merchant.merchant.id,
      storeId: "store-inv-1",
      productId: "prod-inv-1",
      delta: 15,
      reason: "initial_stock",
      createIfMissing: true,
    });

    const session = merchantSession(merchant.merchant.id);
    const res = await handleListStockMovements(
      {
        method: "GET",
        url: `http://localhost/api/v1/inventory/movements?storeId=store-inv-1&productId=prod-inv-1`,
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "",
      },
      ctx,
      session,
    );

    expect(res.status).toBe(200);
    const body = res.body as { data: { items: Array<{ reasonDisplayFa: string; quantityDelta: number }> } };
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]?.quantityDelta).toBe(15);
    expect(body.data.items[0]?.reasonDisplayFa).toBe("اصلاح دستی موجودی");
  });

  it("ADR-149: handleUpdateStore updates weekly store hours via PATCH", async () => {
    const { ctx } = createTestContext();
    const merchant = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه ساعت کاری",
      slug: "hours-shop",
      ownerUserId: "user-hrs",
    });
    await ctx.merchants.activateMerchant({ merchantId: merchant.merchant.id });

    const store = await ctx.stores.createStore({
      merchantId: merchant.merchant.id,
      slug: "hours-branch",
      displayName: "شعبه ساعت کاری",
      address: {
        line1: "خیابان ولیعصر",
        city: "تهران",
        province: "تهران",
        latitude: 35.6892,
        longitude: 51.389,
      },
    });

    const session = merchantSession(merchant.merchant.id);
    const updateRes = await handleUpdateStore(
      jsonRequest("PATCH", `http://localhost/api/v1/stores/${store.store.id}`, {
        hours: {
          saturday: { open: "08:30", close: "21:30" },
          friday: null,
        },
      }),
      ctx,
      session,
      store.store.id,
    );

    expect(updateRes.status).toBe(200);
    const body = updateRes.body as { data: { store: { hours: { saturday: { open: string; close: string }; friday: null } } } };
    expect(body.data.store.hours.saturday).toEqual({ open: "08:30", close: "21:30" });
    expect(body.data.store.hours.friday).toBeNull();
  });

  it("ADR-152: handleCreateProduct persists costAmountMinor for merchant and publicStorefront strips cost fields", async () => {
    const { ctx } = createTestContext();
    const merchant = await ctx.merchants.createMerchant({
      tradeName: "فروشگاه محصولات هزینه",
      slug: "cost-shop",
      ownerUserId: "user-cost",
    });
    await ctx.merchants.activateMerchant({ merchantId: merchant.merchant.id });
    const store = await ctx.stores.createStore({
      merchantId: merchant.merchant.id,
      slug: "cost-branch",
      displayName: "شعبه هزینه",
      address: {
        line1: "خیابان ولیعصر",
        city: "تهران",
        province: "تهران",
        latitude: 35.6892,
        longitude: 51.389,
      },
    });
    const session = merchantSession(merchant.merchant.id);

    const createRes = await handleCreateProduct(
      jsonRequest("POST", "http://localhost/api/v1/catalog/products", {
        name: "شیر کم چرب",
        sku: "MILK-COST-01",
        barcode: "6261111111111",
        priceAmountMinor: 500000,
        costAmountMinor: 350000,
        merchantId: merchant.merchant.id,
      }),
      ctx,
      session,
    );

    expect(createRes.status).toBe(201);
    const body = createRes.body as { data: { product: { costAmountMinor: string | null; costDisplayToman: string | null } } };
    expect(body.data.product.costAmountMinor).toBe("350000");
    expect(body.data.product.costDisplayToman).toBe("۳۵٬۰۰۰ تومان");

    // Public storefront endpoint strictly strips cost fields
    const publicRes = await handleStorefrontProducts(
      {
        method: "GET",
        url: `http://localhost/api/v1/storefront/${store.store.slug}/products`,
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "",
      },
      ctx,
      store.store.slug,
    );

    expect(publicRes.status).toBe(200);
    const publicBody = publicRes.body as { data: { products: Array<Record<string, unknown>> } };
    expect(publicBody.data.products).toHaveLength(1);
    expect(publicBody.data.products[0]).not.toHaveProperty("costAmountMinor");
    expect(publicBody.data.products[0]).not.toHaveProperty("costDisplayToman");
  });
});
