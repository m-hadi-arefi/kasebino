import { createHmac, timingSafeEqual } from "node:crypto";



/**
 * Build sandbox webhook signature (tests / local adapters).
 * Real PSP schemes → ADR-084.
 */
export function signSandboxWebhook(
  rawBody: string,
  secret: string = "merchantos-sandbox-webhook",
): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}



export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
