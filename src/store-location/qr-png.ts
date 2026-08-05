/**
 * ADR-104 — Store QR PNG generation (SF-12 / ADR-081).
 * Encodes stable `/s/{slug}?src=qr`; no secrets in payload.
 */

import QRCode from "qrcode";

import {
  assertQrPayloadSafe,
  buildQrTargetUrl,
} from "../qr-acquisition/index.js";

export type GenerateStoreQrPngInput = {
  storeSlug: string;
  /** Absolute origin preferred for printable stickers. */
  origin?: string;
  width?: number;
  margin?: number;
};

export type GenerateStoreQrPngResult = {
  png: Buffer;
  targetUrl: string;
  contentType: "image/png";
};

export async function generateStoreQrPng(
  input: GenerateStoreQrPngInput,
): Promise<GenerateStoreQrPngResult> {
  const targetUrl = buildQrTargetUrl(input.storeSlug, {
    ...(input.origin ? { origin: input.origin } : {}),
  });
  assertQrPayloadSafe(targetUrl);
  const png = await QRCode.toBuffer(targetUrl, {
    type: "png",
    width: input.width ?? 512,
    margin: input.margin ?? 2,
    errorCorrectionLevel: "M",
  });
  return {
    png: Buffer.from(png),
    targetUrl,
    contentType: "image/png",
  };
}

export function resolvePublicAppOrigin(
  requestUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const configured =
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    env.APP_URL?.trim() ||
    env.AUTH_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  try {
    const u = new URL(requestUrl);
    if (u.origin && u.origin !== "null") {
      return u.origin;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
