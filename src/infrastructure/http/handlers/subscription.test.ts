import { describe, expect, it } from "vitest";
import { createApiContext } from "../../composition/create-api-context.js";
import { createMerchantAggregate } from "../../../modules/merchant/domain/merchant.js";
import { InMemoryMerchantRepository } from "../../../modules/merchant/infrastructure/persistence/in-memory-merchant-repository.js";
import {
  handleGetMerchantCreditBalance,
  handleGetMerchantSubscription,
  handleTopupMerchantCredits,
} from "./merchants-stores.js";
import { handleAdminAssignMerchantPlan } from "./admin.js";
import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { HttpRequestLike } from "../types.js";

function fakeRequest(init: {
  method: string;
  url: string;
  body?: unknown;
}): HttpRequestLike {
  return {
    method: init.method,
    url: init.url,
    headers: new Headers({
      "content-type": "application/json",
      "x-correlation-id": "corr-sub-test",
    }),
    async json() {
      return init.body;
    },
    async text() {
      return JSON.stringify(init.body ?? {});
    },
  };
}

function setupContext() {
  const merchants = new InMemoryMerchantRepository();
  const ctx = createApiContext({
    repos: {
      merchants,
      stores: {} as never,
      products: {} as never,
      categories: {} as never,
      stockItems: {} as never,
      storeMemberships: {} as never,
      sales: {} as never,
      pointRules: {} as never,
      wallets: {} as never,
      pointsLedger: {} as never,
      orders: {} as never,
      payments: {} as never,
      notifications: {} as never,
      adminUsers: {} as never,
      adminActions: {} as never,
    },
  });
  return { ctx, merchants };
}

describe("ADR-153: Subscription & Feature Flags HTTP Handlers", () => {
  it("handles GET /api/v1/merchants/subscription and returns subscription summary", async () => {
    const { ctx, merchants } = setupContext();
    const merchant = createMerchantAggregate({
      id: "m-http-1",
      slug: "http-store",
      tradeName: "فروشگاه آنلاین",
      ownerUserId: "u-1",
    });
    await merchants.save(merchant);

    const session: AuthSessionSnapshot = {
      user: {
        id: "u-1",
        merchantId: merchant.id,
        roles: ["merchant_owner"],
      },
    };

    const req = fakeRequest({
      method: "GET",
      url: "https://api.kasbino.ir/api/v1/merchants/subscription",
    });

    const result = await handleGetMerchantSubscription(req, ctx, session);
    expect(result.status).toBe(200);
    const body = result.body as { data: { subscription: Record<string, unknown> } };
    expect(body.data.subscription.planCode).toBe("pilot");
    expect(body.data.subscription.planNameFa).toBe("پایلوت رایگان");
    expect(body.data.subscription.feeBps).toBe(0);
    expect((body.data.subscription.featureFlags as Record<string, boolean>).advanced_analytics).toBe(true);
  });

  it("handles POST /api/v1/merchants/credits/topup and GET credit balance", async () => {
    const { ctx, merchants } = setupContext();
    const merchant = createMerchantAggregate({
      id: "m-http-2",
      slug: "credit-store-2",
      tradeName: "فروشگاه شارژ",
      ownerUserId: "u-2",
    });
    await merchants.save(merchant);

    const session: AuthSessionSnapshot = {
      user: {
        id: "u-2",
        merchantId: merchant.id,
        roles: ["merchant_owner"],
      },
    };

    const topupReq = fakeRequest({
      method: "POST",
      url: "https://api.kasbino.ir/api/v1/merchants/credits/topup",
      body: { amountMinor: "1000000", reason: "topup" },
    });

    const topupResult = await handleTopupMerchantCredits(topupReq, ctx, session);
    expect(topupResult.status).toBe(201);
    const topupBody = topupResult.body as { data: { credits: Record<string, unknown> } };
    expect(topupBody.data.credits.balanceMinor).toBe("1000000");
    expect(topupBody.data.credits.formattedToman).toContain("۱۰۰٬۰۰۰ تومان");

    const getReq = fakeRequest({
      method: "GET",
      url: "https://api.kasbino.ir/api/v1/merchants/credits",
    });

    const getResult = await handleGetMerchantCreditBalance(getReq, ctx, session);
    expect(getResult.status).toBe(200);
    const getBody = getResult.body as { data: { credits: Record<string, unknown> } };
    expect(getBody.data.credits.balanceMinor).toBe("1000000");
  });

  it("allows platform admin to assign merchant subscription plan via PATCH", async () => {
    const { ctx, merchants } = setupContext();
    const merchant = createMerchantAggregate({
      id: "m-http-3",
      slug: "plan-store",
      tradeName: "فروشگاه اختصاصی",
      ownerUserId: "u-3",
    });
    await merchants.save(merchant);

    const adminSession: AuthSessionSnapshot = {
      user: {
        id: "admin-1",
        roles: ["platform_admin"],
      },
    };

    const patchReq = fakeRequest({
      method: "PATCH",
      url: `https://api.kasbino.ir/api/v1/admin/merchants/${merchant.id}/plan`,
      body: { planCode: "pro", feeBps: 200 },
    });

    const result = await handleAdminAssignMerchantPlan(
      patchReq,
      ctx,
      adminSession,
      merchant.id,
    );

    expect(result.status).toBe(200);
    const body = result.body as { data: { subscription: Record<string, unknown> } };
    expect(body.data.subscription.planCode).toBe("pro");
    expect(body.data.subscription.planNameFa).toBe("حرفه‌ای");
    expect(body.data.subscription.feeBps).toBe(200);
    expect(body.data.subscription.feePercent).toBe("2.00");
  });
});
