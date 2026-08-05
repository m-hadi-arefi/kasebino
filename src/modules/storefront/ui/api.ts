/**
 * ADR-100 storefront HTTP clients (session cookies for checkout).
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import { DIGITAL_CONSENT_CHECKBOX_LABEL_FA } from "../../../crm-membership/index.js";
import { STOREFRONT_UI_COPY_FA } from "./copy.js";

export type PublicStoreDto = {
  id: string;
  slug: string;
  status: string;
  branding: {
    displayName: string;
    logoObjectKey: string | null;
    primaryColor: string | null;
    logoUrl?: string | null;
  };
  hours: Record<string, { open: string; close: string } | null>;
  address: {
    displayAddress: string;
    city: string;
    province: string;
    latitude: number | null;
    longitude: number | null;
  };
  map?: {
    available: boolean;
    staticImagePath: string | null;
    fallbackReason: "none" | "provider_unconfigured" | "invalid_geo";
    latitude: number;
    longitude: number;
    navigate: {
      neshan: string;
      google: string;
      apple: string;
      geo: string;
    };
    navigateItems: Array<{
      provider: string;
      href: string;
      labelFa: string;
    }>;
  };
  fulfillment: { mode: "pickup" };
};

export type PublicProductDto = {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  priceAmountMinor: string;
  priceDisplayToman: string;
  availableQuantity: number;
  inStock: boolean;
};

export type StorefrontOrderDto = {
  id: string;
  status: string;
  fulfillmentMode: "pickup";
  totalAmountMinor: string;
  totalDisplayToman: string;
  lines: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceMinor: string;
    lineDisplayToman: string;
  }>;
};

export type StorefrontPaymentDto = {
  id: string;
  status: string;
  amountMinor: string;
  amountDisplayToman: string;
  providerId: string;
};

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; messageFa?: string };
};

async function parseJson<T>(res: Response): Promise<Envelope<T>> {
  return (await res.json()) as Envelope<T>;
}

function errorMessage(body: Envelope<unknown>, fallback: string): string {
  return body.error?.messageFa ?? body.error?.message ?? fallback;
}

export const STOREFRONT_CONSENT_LABEL_FA = DIGITAL_CONSENT_CHECKBOX_LABEL_FA;

export async function createStorefrontPickupOrder(input: {
  storeSlug: string;
  lines: Array<{ productId: string; quantity: number }>;
  consentCheckboxAccepted: boolean;
  callbackUrl?: string;
}): Promise<{
  order: StorefrontOrderDto;
  payment: StorefrontPaymentDto | null;
  redirectUrl: string | null;
  created: boolean;
}> {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Idempotency-Key":
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sf-${Date.now()}`,
  });
  for (const [k, v] of Object.entries(csrfHeadersForBrowserFetch())) {
    headers.set(k, v);
  }

  const res = await fetch(
    `/api/v1/storefront/${encodeURIComponent(input.storeSlug)}/orders`,
    {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify({
        lines: input.lines,
        consentCheckboxAccepted: input.consentCheckboxAccepted,
        ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
      }),
    },
  );
  const body = await parseJson<{
    order: StorefrontOrderDto;
    payment?: StorefrontPaymentDto;
    redirectUrl: string | null;
    created: boolean;
    fulfillment: { mode: "pickup" };
  }>(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, STOREFRONT_UI_COPY_FA.networkError));
  }
  if (!body.data?.order) {
    throw new Error(STOREFRONT_UI_COPY_FA.networkError);
  }
  return {
    order: body.data.order,
    payment: body.data.payment ?? null,
    redirectUrl: body.data.redirectUrl ?? null,
    created: body.data.created ?? true,
  };
}

/** Local/dev sandbox confirm — requires MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM=1. */
export async function confirmSandboxPayment(input: {
  paymentId: string;
  outcome?: "succeeded" | "failed";
}): Promise<{
  payment: StorefrontPaymentDto;
  confirmed: boolean;
  orderStatus: string | null;
}> {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const [k, v] of Object.entries(csrfHeadersForBrowserFetch())) {
    headers.set(k, v);
  }
  const res = await fetch(
    `/api/v1/payments/${encodeURIComponent(input.paymentId)}/sandbox/confirm`,
    {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify({
        outcome: input.outcome ?? "succeeded",
      }),
    },
  );
  const body = await parseJson<{
    payment: StorefrontPaymentDto;
    confirmed: boolean;
    order: { status?: string } | null;
  }>(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, STOREFRONT_UI_COPY_FA.paymentFailedRetry));
  }
  if (!body.data?.payment) {
    throw new Error(STOREFRONT_UI_COPY_FA.networkError);
  }
  return {
    payment: body.data.payment,
    confirmed: body.data.confirmed,
    orderStatus: body.data.order?.status ?? null,
  };
}
