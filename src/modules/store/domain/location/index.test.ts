import { describe, expect, it } from "vitest";

import {
  buildNavigateLinks,
  buildPublicStoreMapDto,
  createEnvStaticMapProvider,
  createTemplateStaticMapProvider,
} from "./index.js";
import { generateStoreQrPng } from "./qr-png.js";
import { hasQrAcquisitionSource } from "../../../storefront/domain/qr-acquisition/index.js";

describe("ADR-104 store location + QR", () => {
  it("builds Neshan-first navigate deep links", () => {
    const links = buildNavigateLinks({
      latitude: 30.2839,
      longitude: 57.0834,
      displayAddress: "خیابان شریعتی، کرمان",
    });
    expect(links.neshan).toMatch(/neshan/i);
    expect(links.neshan).toContain("30.2839");
    expect(links.google).toContain("30.2839");
    expect(links.apple).toContain("57.0834");
    expect(links.geo).toMatch(/^geo:/);
  });

  it("falls back when map provider is unconfigured", () => {
    const dto = buildPublicStoreMapDto({
      storeSlug: "shop-a",
      latitude: 30.28,
      longitude: 57.08,
      provider: createEnvStaticMapProvider({}),
    });
    expect(dto.available).toBe(false);
    expect(dto.fallbackReason).toBe("provider_unconfigured");
    expect(dto.staticImagePath).toBeNull();
    expect(dto.navigate.neshan).toBeTruthy();
  });

  it("exposes same-origin static map path when provider configured", () => {
    const provider = createTemplateStaticMapProvider(
      "https://maps.example/static?lat={lat}&lng={lng}&w={width}&h={height}&z={zoom}",
    );
    const dto = buildPublicStoreMapDto({
      storeSlug: "shop-b",
      latitude: 35.7,
      longitude: 51.4,
      provider,
    });
    expect(dto.available).toBe(true);
    expect(dto.staticImagePath).toBe(
      "/api/v1/storefront/shop-b/static-map",
    );
    expect(provider.buildUrl({ latitude: 35.7, longitude: 51.4 })).toContain(
      "lat=35.7",
    );
  });

  it("generates PNG QR encoding /s/{slug}?src=qr", async () => {
    const result = await generateStoreQrPng({
      storeSlug: "atina-kerman",
      origin: "https://app.kasbino.ir",
    });
    expect(result.contentType).toBe("image/png");
    expect(result.png.byteLength).toBeGreaterThan(100);
    expect(result.targetUrl).toBe(
      "https://app.kasbino.ir/s/atina-kerman?src=qr",
    );
    expect(hasQrAcquisitionSource("?src=qr")).toBe(true);
  });
});
