import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertSyncRejectsStockShortage,
} from "../../../infrastructure/http/handlers/pos-sync.js";
import {
  POS_OFFLINE_COPY_FA,
  POS_OFFLINE_IDB,
  POS_OFFLINE_SERVICE_WORKER,
  POS_OFFLINE_SYNC_API,
  createInMemoryOfflineSaleQueue,
  type OfflineCompleteSalePort,
  type OfflineStockPort,
} from "./index.js";
import { mapPosSyncErrorToDraftStatus } from "./browser-queue.js";
import {
  STAFF_PWA_COPY_FA,
  STAFF_PWA_PATHS,
  buildStaffManifest,
} from "../ui/staff-pwa/index.js";
import {
  STORE_CUSTOMER_PWA_COPY_FA,
  STORE_CUSTOMER_PWA_OFFLINE,
  buildStoreCustomerManifest,
  resolveStoreCustomerIconSrc,
  storeCustomerManifestPath,
  storeCustomerStartUrl,
} from "../../storefront/ui/customer-pwa/index.js";

describe("ADR-105 Staff and Store Customer PWA Completion", () => {
  it("keeps staff vs customer manifests and start URLs distinct", () => {
    const staff = buildStaffManifest();
    const customer = buildStoreCustomerManifest("atina-kerman", {
      displayName: "آتینا کرمان",
      primaryColor: "#0f766e",
    });

    expect(staff.start_url).toBe("/pos");
    expect(staff.id).toBe("/pos");
    expect(STAFF_PWA_PATHS.manifestPath).toBe("/staff/manifest.webmanifest");

    expect(customer.start_url).toBe("/s/atina-kerman");
    expect(storeCustomerStartUrl("atina-kerman")).toBe("/s/atina-kerman");
    expect(storeCustomerManifestPath("atina-kerman")).toBe(
      "/s/atina-kerman/manifest.webmanifest",
    );

    expect(staff.start_url).not.toBe(customer.start_url);
    expect(STAFF_PWA_PATHS.manifestPath).not.toContain("/s/");
    expect(customer.start_url).not.toMatch(/^\/pos/);
  });

  it("binds customer manifest branding (name/theme/icon resolution)", () => {
    const branded = buildStoreCustomerManifest("omid", {
      displayName: "سوپر امید",
      primaryColor: "#1a6b4a",
      iconSrc: "/uploads/omid-logo.png",
    });
    expect(branded.name).toBe("سوپر امید");
    expect(branded.theme_color).toBe("#1a6b4a");
    expect(branded.icons[0]?.src).toBe("/uploads/omid-logo.png");

    expect(resolveStoreCustomerIconSrc("/brand/a.png")).toBe("/brand/a.png");
    expect(resolveStoreCustomerIconSrc("https://cdn.example/a.png")).toBe(
      "https://cdn.example/a.png",
    );
    expect(resolveStoreCustomerIconSrc("logos/pending-minio.png")).toBeNull();
    expect(resolveStoreCustomerIconSrc("logos/omid.png", "omid")).toBe(
      "/api/v1/storefront/omid/logo",
    );
  });

  it("ships distinct staff and customer service workers", () => {
    const root = process.cwd();
    const staffSw = join(root, "public/sw-staff.js");
    const customerSw = join(root, "public/sw-store-customer.js");
    expect(existsSync(staffSw)).toBe(true);
    expect(existsSync(customerSw)).toBe(true);

    const staffSrc = readFileSync(staffSw, "utf8");
    const customerSrc = readFileSync(customerSw, "utf8");
    expect(staffSrc).toMatch(/staff|POS|mos-staff/);
    expect(staffSrc).toMatch(/mos-staff-sale-queue/);
    expect(staffSrc).toMatch(/\/api\/v1\/pos\/sales/);
    expect(staffSrc).not.toMatch(/store-customer/);

    expect(customerSrc).toMatch(/store-customer|store customer/i);
    expect(customerSrc).not.toMatch(/\/pos/);
    expect(customerSrc).not.toMatch(/mos-staff-sale-queue/);
    expect(customerSrc).not.toMatch(/JWT|Bearer /);

    expect(POS_OFFLINE_SERVICE_WORKER.scriptUrl).toBe("/sw-staff.js");
    expect(POS_OFFLINE_SERVICE_WORKER.audience).toBe("staff");
    expect(STORE_CUSTOMER_PWA_OFFLINE.serviceWorker).toBe(
      "/sw-store-customer.js",
    );
    expect(STORE_CUSTOMER_PWA_OFFLINE.audience).toBe("store-customer");
  });

  it("maps stock shortage to reject-and-review without silent overwrite", async () => {
    expect(mapPosSyncErrorToDraftStatus("INSUFFICIENT_STOCK")).toBe(
      "rejected_for_review",
    );
    expect(mapPosSyncErrorToDraftStatus("INTERNAL_ERROR")).toBe("failed");
    expect(() =>
      assertSyncRejectsStockShortage("rejected_for_review"),
    ).not.toThrow();
    expect(() => assertSyncRejectsStockShortage("synced")).toThrow(
      /reject_and_review|rejected_for_review/i,
    );

    const queue = createInMemoryOfflineSaleQueue();
    await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      lines: [
        {
          productId: "p1",
          productName: "شیر",
          quantity: 2,
          unitPriceMinor: 50_000n,
        },
      ],
      totalAmountMinor: 100_000n,
      syncKey: "sync-oos",
    });

    const stock: OfflineStockPort = {
      async hasSufficientStock() {
        return false;
      },
    };
    const completeSale: OfflineCompleteSalePort = {
      async complete() {
        throw new Error("must_not_complete_on_stock_shortage");
      },
    };

    const result = await queue.flush({ stock, completeSale });
    expect(result.synced).toBe(0);
    expect(result.rejectedForReview).toBe(1);
    expect(result.failed).toBe(0);
    const rejected = await queue.listRejectedForReview();
    expect(rejected[0]?.rejectReason).toBe("stock_shortage");
    expect(rejected[0]?.status).toBe("rejected_for_review");
  });

  it("documents POS flush path + IDB policy (no JWT plaintext)", () => {
    expect(POS_OFFLINE_SYNC_API.path).toBe("/api/v1/sales/sync");
    expect(POS_OFFLINE_SYNC_API.completeSalePath).toBe("/api/v1/pos/sales");
    expect(POS_OFFLINE_SYNC_API.syncKeyEqualsIdempotencyKey).toBe(true);
    expect(POS_OFFLINE_IDB.jwtPlaintextForbidden).toBe(true);
    expect(POS_OFFLINE_IDB.secretsForbidden).toBe(true);
    expect(POS_OFFLINE_IDB.dbName).toBe("mos-staff-pos");
    expect(existsSync(join(process.cwd(), "app/api/v1/sales/sync/route.ts"))).toBe(
      true,
    );
  });

  it("ships Persian RTL install + offline copy including iOS A2HS", () => {
    for (const msg of Object.values(POS_OFFLINE_COPY_FA)) {
      expect(msg).toMatch(/[\u0600-\u06FF]/);
    }
    expect(POS_OFFLINE_COPY_FA.stockRejected).toMatch(/موجودی|بررسی/);
    expect(POS_OFFLINE_COPY_FA.saleQueuedSuccess).toMatch(/صف آفلاین/);
    expect(STAFF_PWA_COPY_FA.iosHint).toMatch(/سافاری|صفحهٔ اصلی/);
    expect(STORE_CUSTOMER_PWA_COPY_FA.iosHint).toMatch(/سافاری|صفحهٔ اصلی/);
    expect(STORE_CUSTOMER_PWA_COPY_FA.browserHint).toMatch(/مرورگر|صفحهٔ اصلی/);
  });

  it("scaffolds default PWA icons and ADR-105 plan", () => {
    const root = process.cwd();
    expect(existsSync(join(root, "public/icons/staff-pwa-default.svg"))).toBe(
      true,
    );
    expect(
      existsSync(join(root, "public/icons/store-customer-pwa-default.svg")),
    ).toBe(true);
    expect(existsSync(join(root, "docs/execution/plans/ADR-105.md"))).toBe(
      true,
    );
    const plan = readFileSync(
      join(root, "docs/execution/plans/ADR-105.md"),
      "utf8",
    );
    expect(plan).toMatch(/Iranian First|Persian|RTL/);
    expect(plan).toMatch(/uiuxpromax|Brief/);
    expect(plan).toMatch(/Never conflate|staff|customer/i);
  });
});
