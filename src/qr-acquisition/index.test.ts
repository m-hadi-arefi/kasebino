import { describe, expect, it } from "vitest";
import { MEMBERSHIP_SOURCES } from "../crm-membership/index.js";
import { MINIO_BUCKETS, OBJECT_LIMITS } from "../minio-storage/index.js";
import {
  STOREFRONT_URL_POLICY,
  buildStorefrontPath,
} from "../mvp-policies/index.js";
import { STOREFRONT_EVENTS } from "../storefront-architecture/index.js";
import {
  QR_ACQUISITION,
  QR_ACQUISITION_API,
  QR_ACQUISITION_DECISION,
  QR_ACQUISITION_EVENTS,
  QR_LANDING_COPY_FA,
  QR_MINIO_STORAGE,
  QR_SECURITY,
  QR_SOURCE_QUERY,
  QR_STICKER_PRINT_NOTES_FA,
  QR_URL_STABILITY,
  assertQrMembershipSource,
  assertQrPayloadSafe,
  assertStoreScannable,
  buildQrTargetUrl,
  buildStoreQrObjectKey,
  createStoreQrRef,
  hasQrAcquisitionSource,
} from "./index.js";

describe("ADR-081 QR Acquisition Architecture", () => {
  it("encodes stable storefront canonical URL with ?src=qr via buildStorefrontPath", () => {
    expect(QR_ACQUISITION_DECISION.encodesCanonicalStorefrontUrl).toBe(true);
    expect(QR_ACQUISITION_DECISION.sourceQuery).toBe(
      STOREFRONT_URL_POLICY.qrSourceQuery,
    );
    expect(QR_SOURCE_QUERY.pair).toBe("src=qr");

    const slug = "atina-kerman";
    const path = buildStorefrontPath(slug);
    const url = buildQrTargetUrl(slug);
    expect(url).toBe(`${path}?src=qr`);
    expect(url.startsWith(path)).toBe(true);
    expect(hasQrAcquisitionSource("?src=qr")).toBe(true);
    expect(hasQrAcquisitionSource(new URLSearchParams("src=qr"))).toBe(true);
    expect(hasQrAcquisitionSource("utm=other")).toBe(false);

    expect(
      buildQrTargetUrl(slug, { origin: "https://app.kasbino.ir/" }),
    ).toBe("https://app.kasbino.ir/s/atina-kerman?src=qr");
    expect(buildQrTargetUrl(slug, { campaignId: "norouz" })).toBe(
      "/s/atina-kerman?src=qr&cid=norouz",
    );

    // Image regen must keep the same destination (stability note).
    expect(QR_URL_STABILITY.destinationStableAcrossImageRegen).toBe(true);
    const before = buildQrTargetUrl(slug);
    const after = buildQrTargetUrl(slug);
    expect(after).toBe(before);
  });

  it("places printable QR assets in MinIO qr bucket (StoreQrRef)", () => {
    expect(QR_MINIO_STORAGE.bucket).toBe(MINIO_BUCKETS.qr);
    expect(QR_MINIO_STORAGE.bucket).toBe("qr");
    expect(QR_MINIO_STORAGE.allowedContentTypes).toEqual(
      OBJECT_LIMITS.qr.allowedContentTypes,
    );
    expect(QR_MINIO_STORAGE.storeField).toBe("qrAssetRef");

    const objectKey = buildStoreQrObjectKey({
      merchantId: "m1",
      storeId: "s1",
      filename: "store-qr.png",
    });
    expect(objectKey).toBe("m/m1/s/s1/qr/store-qr.png");

    const ref = createStoreQrRef({
      objectKey,
      contentType: "image/png",
      byteSize: 2048,
    });
    expect(ref.bucket).toBe("qr");
    expect(ref.objectKey).toBe(objectKey);

    expect(() =>
      createStoreQrRef({
        objectKey: "   ",
        contentType: "image/png",
        byteSize: 10,
      }),
    ).toThrow(/objectKey/);
    expect(() =>
      createStoreQrRef({
        objectKey: "k",
        contentType: "application/pdf",
        byteSize: 10,
      }),
    ).toThrow(/contentType/);
  });

  it("documents Persian sticker print notes and RTL landing copy", () => {
    expect(QR_STICKER_PRINT_NOTES_FA.title).toMatch(/QR/);
    expect(QR_STICKER_PRINT_NOTES_FA.window).toMatch(/ویترین/);
    expect(QR_STICKER_PRINT_NOTES_FA.counter).toMatch(/پیشخوان/);
    expect(QR_STICKER_PRINT_NOTES_FA.regenerateNote).toMatch(/مقصد/);

    expect(QR_LANDING_COPY_FA.lang).toBe("fa");
    expect(QR_LANDING_COPY_FA.dir).toBe("rtl");
    expect(QR_LANDING_COPY_FA.minTouchTargetPx).toBe(44);
    expect(QR_LANDING_COPY_FA.welcome).toMatch(/خوش آمدید/);
    expect(QR_LANDING_COPY_FA.joinCta).toMatch(/عضویت/);
    expect(QR_LANDING_COPY_FA.hint).toMatch(/پیکاپ/);
  });

  it("reserves attribution events with source=qr", () => {
    expect(QR_ACQUISITION_EVENTS.generated).toBe("StoreQrGenerated");
    expect(QR_ACQUISITION_EVENTS.storefrontVisited).toBe(
      STOREFRONT_EVENTS.visited,
    );
    expect(QR_ACQUISITION_EVENTS.storefrontVisited).toBe("StorefrontVisited");
    expect(QR_ACQUISITION_EVENTS.membershipCreated).toBe("MembershipCreated");
    expect(QR_ACQUISITION_EVENTS.attributionSource).toBe("qr");
    expect(MEMBERSHIP_SOURCES).toContain("qr");

    expect(() => assertQrMembershipSource("qr")).not.toThrow();
    expect(() => assertQrMembershipSource("pos")).toThrow(/source="qr"/);
  });

  it("forbids secrets in QR payload and requires active store for scan", () => {
    expect(QR_SECURITY.noSecrets).toBe(true);
    expect(() => assertQrPayloadSafe(buildQrTargetUrl("shop-a"))).not.toThrow();
    expect(() =>
      assertQrPayloadSafe(
        "https://app.kasbino.ir/s/shop-a?src=qr&token=secret",
      ),
    ).toThrow(/secrets/i);
    expect(() => assertQrPayloadSafe("/s/shop-a")).toThrow(/src=qr/);

    expect(() => assertStoreScannable("active")).not.toThrow();
    expect(() => assertStoreScannable("inactive")).toThrow(/active/);
    expect(() => assertStoreScannable("draft")).toThrow(/active/);
  });

  it("reserves QR API paths and exports package snapshot", () => {
    expect(QR_ACQUISITION_API.getQr).toBe("/api/v1/stores/:id/qr");
    expect(QR_ACQUISITION_API.regenerateQr).toBe(
      "/api/v1/stores/:id/qr/regenerate",
    );
    expect(QR_ACQUISITION.decision.adr).toBe("ADR-081");
    expect(QR_ACQUISITION.minio.bucket).toBe("qr");
    expect(QR_ACQUISITION.events.attributionSource).toBe("qr");
  });
});
