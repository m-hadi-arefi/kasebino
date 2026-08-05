/**
 * ADR-093 — optional live Postgres Drizzle repository integration.
 * Runs only when DATABASE_URL is set (Compose / CI).
 */

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { createDb } from "../database/drizzle/client.js";
import { merchants } from "../database/schema/merchants.js";
import { stores } from "../database/schema/stores.js";
import { authUsers } from "../database/schema/identity.js";
import { products } from "../database/schema/catalog.js";
import { storeMemberships } from "../database/schema/memberships.js";
import { sales, saleLines } from "../database/schema/sales.js";
import { createMerchantAggregate } from "../../modules/merchant/domain/merchant.js";
import { createStoreAggregate } from "../../modules/store/domain/store.js";
import { defaultIranRetailHours } from "../../modules/store/domain/hours.js";
import { createAuthUser } from "../../modules/identity/domain/auth-user.js";
import { createProductAggregate } from "../../modules/catalog/domain/product.js";
import { moneyFromMinor } from "../../shared/domain/money.js";
import { createStoreMembershipAggregate } from "../../modules/crm/domain/store-membership.js";
import { createMembershipConsent } from "../../modules/crm/domain/consent.js";
import { createCompletedSaleAggregate } from "../../modules/pos/domain/sale.js";
import { softDeleteProduct } from "../../modules/catalog/domain/product.js";
import { softDeleteMembership } from "../../modules/crm/domain/store-membership.js";
import { createProductionRepositoriesFromDb } from "./create-production-repositories.js";
import { assertProductionRepositoriesForbidInMemory } from "./assert-production-repositories.js";

const databaseUrl = process.env.DATABASE_URL;

type SqlClient = { end: (opts?: { timeout?: number }) => Promise<void> };

function getClient(db: ReturnType<typeof createDb>): SqlClient {
  return (db as unknown as { $client: SqlClient }).$client;
}

describe.runIf(Boolean(databaseUrl))(
  "ADR-093 Drizzle repositories (live Postgres)",
  () => {
    it("CRUD + tenant isolation + soft-delete for core aggregates", async () => {
      const db = createDb(databaseUrl!);
      const client = getClient(db);
      const repos = createProductionRepositoriesFromDb(db);
      const adapters = { ...repos };
      delete (adapters as { db?: unknown }).db;
      assertProductionRepositoriesForbidInMemory(adapters);

      const merchantA = randomUUID();
      const merchantB = randomUUID();
      const storeA = randomUUID();
      const storeB = randomUUID();
      const userId = randomUUID();
      const productA = randomUUID();
      const productB = randomUUID();
      const membershipId = randomUUID();
      const customerId = randomUUID();
      const saleId = randomUUID();
      const lineId = randomUUID();
      const now = new Date();

      try {
        const mA = createMerchantAggregate({
          id: merchantA,
          tradeName: "فروشگاه کاشانو",
          slug: `m-a-${merchantA.slice(0, 8)}`,
          ownerUserId: userId,
          contactPhoneNational: "09121234567",
          contactPhoneE164: "+989121234567",
          now,
        });
        const mB = createMerchantAggregate({
          id: merchantB,
          tradeName: "فروشگاه دیگر",
          slug: `m-b-${merchantB.slice(0, 8)}`,
          ownerUserId: userId,
          now,
        });
        await repos.merchants.save(mA);
        await repos.merchants.save(mB);

        const foundMerchant = await repos.merchants.findById(merchantA);
        expect(foundMerchant?.tradeName).toBe("فروشگاه کاشانو");
        expect(foundMerchant?.contactPhoneNational).toBe("09121234567");

        const storeAgg = createStoreAggregate({
          id: storeA,
          merchantId: merchantA,
          slug: `s-a-${storeA.slice(0, 8)}`,
          branding: { displayName: "شعبه کرمان", logoObjectKey: null, primaryColor: null },
          hours: defaultIranRetailHours(),
          address: {
            line1: "خیابان شریعتی",
            line2: null,
            city: "کرمان",
            province: "کرمان",
            postalCode: null,
            displayAddress: "کرمان، خیابان شریعتی",
            latitude: 30.28,
            longitude: 57.08,
          },
          now,
        });
        await repos.stores.save(storeAgg);
        await repos.stores.save(
          createStoreAggregate({
            id: storeB,
            merchantId: merchantB,
            slug: `s-b-${storeB.slice(0, 8)}`,
            branding: {
              displayName: "شعبه دیگر",
              logoObjectKey: null,
              primaryColor: null,
            },
            hours: defaultIranRetailHours(),
            address: {
              line1: "خیابان آزادی",
              line2: null,
              city: "تهران",
              province: "تهران",
              postalCode: null,
              displayAddress: "تهران",
              latitude: 35.7,
              longitude: 51.4,
            },
            now,
          }),
        );

        const storesForA = await repos.stores.listByMerchantId(merchantA);
        expect(storesForA).toHaveLength(1);
        expect(storesForA[0]?.branding.displayName).toBe("شعبه کرمان");

        const authUser = createAuthUser({
          id: userId,
          phoneNational: "09129876543",
          phoneE164: "+989129876543",
          now,
        });
        await repos.authUsers.save(authUser);
        const foundUser = await repos.authUsers.findByPhoneE164(
          "+989129876543",
        );
        expect(foundUser?.phoneNational).toBe("09129876543");

        const prodA = createProductAggregate({
          id: productA,
          merchantId: merchantA,
          name: "نان بربری",
          sku: `sku-a-${productA.slice(0, 6)}`,
          barcode: `bc-a-${productA.slice(0, 6)}`,
          price: moneyFromMinor(50_000n),
          now,
        });
        const prodB = createProductAggregate({
          id: productB,
          merchantId: merchantB,
          name: "شیر محلی",
          sku: `sku-b-${productB.slice(0, 6)}`,
          barcode: `bc-b-${productB.slice(0, 6)}`,
          price: moneyFromMinor(80_000n),
          now,
        });
        await repos.products.save(prodA);
        await repos.products.save(prodB);

        const listedA = await repos.products.listByMerchantId(merchantA);
        expect(listedA.map((p) => p.id)).toEqual([productA]);
        expect(listedA[0]?.name).toBe("نان بربری");

        softDeleteProduct(prodA, now);
        await repos.products.update(prodA);
        expect(await repos.products.listByMerchantId(merchantA)).toHaveLength(
          0,
        );
        expect(
          await repos.products.listByMerchantId(merchantA, {
            includeDeleted: true,
          }),
        ).toHaveLength(1);

        const membership = createStoreMembershipAggregate({
          id: membershipId,
          merchantId: merchantA,
          storeId: storeA,
          customerId,
          phoneNational: "09121112233",
          phoneE164: "+989121112233",
          source: "pos",
          consent: createMembershipConsent({
            surface: "pos_notice_continue",
            version: "pos-consent-v1",
            consentedAt: now,
          }),
          now,
        });
        await repos.storeMemberships.save(membership);
        const byPhone = await repos.storeMemberships.findByStoreAndPhone(
          storeA,
          "09121112233",
        );
        expect(byPhone?.id).toBe(membershipId);

        softDeleteMembership(membership, now);
        await repos.storeMemberships.update(membership);
        expect(
          await repos.storeMemberships.findByStoreAndPhone(
            storeA,
            "09121112233",
          ),
        ).toBeNull();
        expect(
          await repos.storeMemberships.listByStoreId(storeA, {
            merchantId: merchantA,
          }),
        ).toHaveLength(0);
        expect(
          await repos.storeMemberships.listByStoreId(storeA, {
            merchantId: merchantA,
            includeDeleted: true,
          }),
        ).toHaveLength(1);

        // Restore product for sale FK-free insert
        prodA.deletedAt = null;
        prodA.updatedAt = now;
        await repos.products.update(prodA);

        const sale = createCompletedSaleAggregate({
          id: saleId,
          merchantId: merchantA,
          storeId: storeA,
          membershipId: null,
          customerId: null,
          phoneNational: "09124445566",
          tenderType: "cash",
          lines: [
            {
              id: lineId,
              productId: productA,
              productName: "نان بربری",
              quantity: 2,
              unitPriceMinor: 50_000n,
            },
          ],
          idempotencyKey: `idem-${saleId.slice(0, 8)}`,
          now,
        });
        await repos.sales.save(sale);
        const foundSale = await repos.sales.findByIdempotencyKey(
          merchantA,
          sale.idempotencyKey,
        );
        expect(foundSale?.totalAmountMinor).toBe(100_000n);
        expect(foundSale?.lines[0]?.productName).toBe("نان بربری");
        expect(
          await repos.sales.findByIdempotencyKey(
            merchantB,
            sale.idempotencyKey,
          ),
        ).toBeNull();
      } finally {
        await db.delete(saleLines).where(eq(saleLines.saleId, saleId));
        await db.delete(sales).where(eq(sales.id, saleId));
        await db
          .delete(storeMemberships)
          .where(eq(storeMemberships.id, membershipId));
        await db.delete(products).where(eq(products.id, productA));
        await db.delete(products).where(eq(products.id, productB));
        await db.delete(authUsers).where(eq(authUsers.id, userId));
        await db.delete(stores).where(eq(stores.id, storeA));
        await db.delete(stores).where(eq(stores.id, storeB));
        await db.delete(merchants).where(eq(merchants.id, merchantA));
        await db.delete(merchants).where(eq(merchants.id, merchantB));
        await client.end({ timeout: 5 });
      }
    });
  },
);
