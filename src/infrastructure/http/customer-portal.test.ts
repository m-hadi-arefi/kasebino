/**
 * ADR-103 — Customer portal me/* handlers + cross-store isolation.
 */

import { describe, expect, it } from "vitest";

import { createInMemoryRateLimiter } from "../../rate-limiting/index.js";
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
import { bootstrapCustomerStoreSession } from "../auth/customer-session-bootstrap.js";
import { InMemoryCustomerIdentityRepository } from "../../modules/customer-identity/infrastructure/index.js";
import {
  createCustomerIdentity,
  customerLoggedInEvent,
} from "../../modules/customer-identity/domain/index.js";
import { InMemoryOutboxStore } from "../../outbox/index.js";
import {
  handleCustomerStorefrontMe,
  handleCustomerStorefrontMeOrders,
  handleCustomerStorefrontMeReceipts,
  handleCustomerStorefrontMeRewards,
} from "./handlers/customer-portal.js";
import { handleCustomerStorefrontWallet } from "./handlers/loyalty.js";

function jsonRequest(method: string, url: string) {
  return {
    method,
    url,
    headers: {
      get() {
        return null;
      },
    },
    async json() {
      throw new Error("no body");
    },
    async text() {
      return "";
    },
  };
}

function customerSession(
  userId: string,
  storeId: string | null,
): AuthSessionSnapshot {
  return {
    audience: "customer",
    storeId,
    role: "customer",
    user: {
      id: userId,
      storeId,
      audience: "customer",
      role: "customer",
      tokenVersion: 0,
    },
  };
}

async function seedPortalWorld(): Promise<{
  ctx: ApiContext;
  storeA: { id: string; slug: string; merchantId: string };
  storeB: { id: string; slug: string; merchantId: string };
  identityId: string;
  membershipAId: string;
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
  const { limiter } = createInMemoryRateLimiter("portal-test");
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
    tradeName: "آتینا",
    slug: "atina",
    ownerUserId: "owner-portal",
  });
  await ctx.merchants.activateMerchant({ merchantId: created.merchant.id });
  const storeA = await ctx.stores.createStore({
    merchantId: created.merchant.id,
    slug: "atina-a",
    displayName: "آتینا الف",
    address: {
      line1: "خیابان ۱",
      city: "کرمان",
      province: "کرمان",
      latitude: 30.28,
      longitude: 57.08,
    },
  });
  const storeB = await ctx.stores.createStore({
    merchantId: created.merchant.id,
    slug: "atina-b",
    displayName: "آتینا ب",
    address: {
      line1: "خیابان ۲",
      city: "کرمان",
      province: "کرمان",
      latitude: 30.29,
      longitude: 57.09,
    },
  });

  const identity = createCustomerIdentity({
    id: "cust-portal-1",
    phoneNational: "09123334455",
    phoneE164: "+989123334455",
  });
  await customerIdentities.save(identity);

  const joined = await ctx.crm.joinWithDigitalConsent({
    merchantId: created.merchant.id,
    storeId: storeA.store.id,
    phone: identity.phoneNational,
    source: "storefront",
    consentCheckboxAccepted: true,
  });

  await ctx.ordering.createOrder({
    merchantId: created.merchant.id,
    storeId: storeA.store.id,
    membershipId: joined.membership.id,
    customerId: joined.membership.customerId,
    idempotencyKey: "portal-order-1",
    lines: [
      {
        id: "line-1",
        productId: "p1",
        productName: "نان بربری",
        quantity: 2,
        unitPriceMinor: 50_000n,
      },
    ],
    fulfillmentMode: "pickup",
  });

  return {
    ctx,
    storeA: {
      id: storeA.store.id,
      slug: storeA.store.slug,
      merchantId: created.merchant.id,
    },
    storeB: {
      id: storeB.store.id,
      slug: storeB.store.slug,
      merchantId: created.merchant.id,
    },
    identityId: identity.id,
    membershipAId: joined.membership.id,
  };
}

describe("ADR-103 customer portal", () => {
  it("bootstrap joins membership and returns store UUID for slug", async () => {
    const world = await seedPortalWorld();
    const verified = {
      customerIdentityId: world.identityId,
      phoneE164: "+989123334455",
      phoneNational: "09123334455",
      role: "customer" as const,
      tokenVersion: 0,
      event: customerLoggedInEvent({
        customerIdentityId: world.identityId,
        phoneE164: "+989123334455",
        storeId: world.storeB.slug,
      }),
    };

    const result = await bootstrapCustomerStoreSession(world.ctx, {
      verified,
      storeRef: world.storeB.slug,
    });
    expect(result.storeId).toBe(world.storeB.id);
    expect(result.membershipId).toBeTruthy();

    const membership = await world.ctx.repos.storeMemberships.findByStoreAndPhone(
      world.storeB.id,
      "09123334455",
    );
    expect(membership?.id).toBe(result.membershipId);
  });

  it("me + orders return live membership-scoped data", async () => {
    const world = await seedPortalWorld();
    const session = customerSession(world.identityId, world.storeA.id);

    const me = await handleCustomerStorefrontMe(
      jsonRequest("GET", `http://localhost/api/v1/storefront/${world.storeA.slug}/me`),
      world.ctx,
      session,
      world.storeA.slug,
    );
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      data: {
        storeId: world.storeA.id,
        membership: { id: world.membershipAId },
        phoneMasked: expect.stringMatching(/0912\*\*\*/),
      },
    });

    const orders = await handleCustomerStorefrontMeOrders(
      jsonRequest(
        "GET",
        `http://localhost/api/v1/storefront/${world.storeA.slug}/me/orders`,
      ),
      world.ctx,
      session,
      world.storeA.slug,
    );
    expect(orders.status).toBe(200);
    const orderData = (orders.body as { data: { orders: Array<{ id: string }> } })
      .data;
    expect(orderData.orders.length).toBe(1);

    const wallet = await handleCustomerStorefrontWallet(
      jsonRequest(
        "GET",
        `http://localhost/api/v1/storefront/${world.storeA.slug}/wallet`,
      ),
      world.ctx,
      session,
      world.storeA.slug,
    );
    expect(wallet.status).toBe(200);
    expect(wallet.body).toMatchObject({
      data: { storeId: world.storeA.id, membershipId: world.membershipAId },
    });

    const rewards = await handleCustomerStorefrontMeRewards(
      jsonRequest(
        "GET",
        `http://localhost/api/v1/storefront/${world.storeA.slug}/me/rewards`,
      ),
      world.ctx,
      session,
      world.storeA.slug,
    );
    expect(rewards.status).toBe(200);
    expect(rewards.body).toMatchObject({ data: { rewards: [] } });

    const receipts = await handleCustomerStorefrontMeReceipts(
      jsonRequest(
        "GET",
        `http://localhost/api/v1/storefront/${world.storeA.slug}/me/receipts`,
      ),
      world.ctx,
      session,
      world.storeA.slug,
    );
    expect(receipts.status).toBe(200);
    expect(receipts.body).toMatchObject({ data: { receipts: [] } });
  });

  it("blocks cross-store portal reads (session store A vs slug B)", async () => {
    const world = await seedPortalWorld();
    const sessionOnA = customerSession(world.identityId, world.storeA.id);

    const forbidden = await handleCustomerStorefrontMe(
      jsonRequest("GET", `http://localhost/api/v1/storefront/${world.storeB.slug}/me`),
      world.ctx,
      sessionOnA,
      world.storeB.slug,
    );
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toMatchObject({
      error: { code: "FORBIDDEN" },
    });

    const ordersForbidden = await handleCustomerStorefrontMeOrders(
      jsonRequest(
        "GET",
        `http://localhost/api/v1/storefront/${world.storeB.slug}/me/orders`,
      ),
      world.ctx,
      sessionOnA,
      world.storeB.slug,
    );
    expect(ordersForbidden.status).toBe(403);

    const walletForbidden = await handleCustomerStorefrontWallet(
      jsonRequest(
        "GET",
        `http://localhost/api/v1/storefront/${world.storeB.slug}/wallet`,
      ),
      world.ctx,
      sessionOnA,
      world.storeB.slug,
    );
    expect(walletForbidden.status).toBe(403);
  });

  it("rejects unauthenticated portal me", async () => {
    const world = await seedPortalWorld();
    const unauth = await handleCustomerStorefrontMe(
      jsonRequest("GET", `http://localhost/api/v1/storefront/${world.storeA.slug}/me`),
      world.ctx,
      null,
      world.storeA.slug,
    );
    expect(unauth.status).toBe(401);
  });
});
