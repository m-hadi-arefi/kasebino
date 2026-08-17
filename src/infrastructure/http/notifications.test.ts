/**
 * ADR-107 — Notifications list/mark-read + domain event → row + tenant isolation.
 */

import { describe, expect, it } from "vitest";

import { createInMemoryRateLimiter } from "../security/rate-limiting/index.js";
import {
  createAdminAuditPortStub,
  InMemoryAdminActionRepository,
  InMemoryAdminUserRepository,
} from "../../modules/admin/infrastructure/index.js";
import { createRecordingSecurityMonitoringPort } from "../../modules/admin/application/ports.js";
import {
  InMemoryCategoryRepository,
  InMemoryProductRepository,
} from "../../modules/catalog/infrastructure/index.js";
import { InMemoryStoreMembershipRepository } from "../../modules/crm/infrastructure/index.js";
import { InMemoryStockItemRepository } from "../../modules/inventory/infrastructure/index.js";
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
import { InMemoryCustomerIdentityRepository } from "../../modules/customer-identity/infrastructure/index.js";
import { InMemoryOutboxStore } from "../../events/outbox/index.js";
import {
  handleAdjustInventory,
  handleListNotifications,
  handleMarkNotificationRead,
  handleOrderReady,
} from "./index.js";

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

async function seedMerchantCtx(slugSuffix: string): Promise<{
  ctx: ApiContext;
  merchantId: string;
  storeId: string;
  productId: string;
  notifications: InMemoryNotificationRepository;
}> {
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
  const { limiter } = createInMemoryRateLimiter(`test-ntf-${slugSuffix}`);

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
    audit: createAdminAuditPortStub().port,
    securityMonitoring: createRecordingSecurityMonitoringPort(),
  });

  const created = await ctx.merchants.createMerchant({
    tradeName: `مغازه اعلان ${slugSuffix}`,
    slug: `ntf-${slugSuffix}`,
    ownerUserId: "user-1",
  });
  await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
  const store = await ctx.stores.createStore({
    merchantId: created.merchant.id,
    slug: `store-${slugSuffix}`,
    displayName: "شعبه یک",
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
    name: "نان",
    sku: `sku-${slugSuffix}`,
    barcode: `626${slugSuffix.padStart(10, "0").slice(0, 10)}`,
    priceAmountMinor: 10_000n,
  });
  await ctx.inventory.adjustStock({
    merchantId: created.merchant.id,
    storeId: store.store.id,
    productId: product.product.id,
    delta: 2,
    createIfMissing: true,
  });

  return {
    ctx,
    merchantId: created.merchant.id,
    storeId: store.store.id,
    productId: product.product.id,
    notifications,
  };
}

describe("ADR-107 notifications center HTTP", () => {
  it("inventory depleted domain event produces Persian in-app notification row", async () => {
    const seeded = await seedMerchantCtx("dep1");
    const session = merchantSession(seeded.merchantId);

    await handleAdjustInventory(
      jsonRequest("POST", "http://localhost/api/v1/inventory/adjust", {
        storeId: seeded.storeId,
        productId: seeded.productId,
        delta: -2,
        merchantId: seeded.merchantId,
      }),
      seeded.ctx,
      session,
    );

    const listed = await handleListNotifications(
      jsonRequest("GET", "http://localhost/api/v1/notifications"),
      seeded.ctx,
      session,
    );
    expect(listed.status).toBe(200);
    const body = listed.body as {
      data?: {
        notifications: Array<{ titleFa: string; bodyFa: string; type: string }>;
        unreadCount: number;
      };
    };
    expect((body.data?.notifications.length ?? 0) > 0).toBe(true);
    const row = body.data!.notifications[0]!;
    expect(row.titleFa).toMatch(PERSIAN);
    expect(row.bodyFa).toMatch(PERSIAN);
    expect(row.type).toBe("inventory_depleted");
    expect(body.data!.unreadCount).toBeGreaterThan(0);
  });

  it("lists and marks read; blocks cross-tenant markRead", async () => {
    const a = await seedMerchantCtx("tenA");
    const b = await seedMerchantCtx("tenB");
    const sessionA = merchantSession(a.merchantId);
    const sessionB = merchantSession(b.merchantId);

    await handleAdjustInventory(
      jsonRequest("POST", "http://localhost/api/v1/inventory/adjust", {
        storeId: a.storeId,
        productId: a.productId,
        delta: -2,
        merchantId: a.merchantId,
      }),
      a.ctx,
      sessionA,
    );

    const listed = await handleListNotifications(
      jsonRequest("GET", "http://localhost/api/v1/notifications"),
      a.ctx,
      sessionA,
    );
    const id = (
      listed.body as {
        data?: { notifications: Array<{ id: string }> };
      }
    ).data?.notifications[0]?.id;
    expect(id).toBeTruthy();

    const marked = await handleMarkNotificationRead(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/notifications/${id}/read`,
        {},
      ),
      a.ctx,
      sessionA,
      id!,
    );
    expect(marked.status).toBe(200);
    expect(
      (marked.body as { data?: { notification: { readAt: string | null } } })
        .data?.notification.readAt,
    ).toBeTruthy();

    const leak = await handleMarkNotificationRead(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/notifications/${id}/read`,
        {},
      ),
      b.ctx,
      sessionB,
      id!,
    );
    expect([403, 404]).toContain(leak.status);
    const err = leak.body as {
      error?: { messageFa?: string; message?: string };
    };
    expect(PERSIAN.test(err.error?.messageFa ?? err.error?.message ?? "")).toBe(
      true,
    );

    const listB = await handleListNotifications(
      jsonRequest("GET", "http://localhost/api/v1/notifications"),
      b.ctx,
      sessionB,
    );
    expect(
      (
        listB.body as {
          data?: { notifications: unknown[] };
        }
      ).data?.notifications,
    ).toEqual([]);
  });

  it("order ready produces customer-audience notification with customerId", async () => {
    const seeded = await seedMerchantCtx("ready1");
    const session = merchantSession(seeded.merchantId);

    const order = await seeded.ctx.ordering.createOrder({
      merchantId: seeded.merchantId,
      storeId: seeded.storeId,
      membershipId: null,
      customerId: "cust-ready-1",
      idempotencyKey: "idem-ready-1",
      lines: [
        {
          id: "line-1",
          productId: seeded.productId,
          productName: "نان",
          quantity: 1,
          unitPriceMinor: 10000n,
        },
      ],
      fulfillmentMode: "pickup",
    });

    await seeded.ctx.ordering.markPaid({
      orderId: order.order.id,
      paymentReference: "pay-test",
    });
    await seeded.ctx.ordering.startPreparing({ orderId: order.order.id });

    const ready = await handleOrderReady(
      jsonRequest(
        "POST",
        `http://localhost/api/v1/orders/${order.order.id}/ready`,
        {},
      ),
      seeded.ctx,
      session,
      order.order.id,
    );
    expect(ready.status).toBe(200);

    const rows = await seeded.notifications.list({
      merchantId: seeded.merchantId,
      audience: "customer",
      channel: "in_app",
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.type).toBe("order_ready_for_pickup");
    expect(rows[0]?.userId).toBe("cust-ready-1");
    expect(rows[0]?.titleFa).toMatch(PERSIAN);
  });
});
