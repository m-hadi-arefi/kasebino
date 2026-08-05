/**
 * ADR-103 customer portal HTTP clients (session cookies).
 */

import { csrfHeadersForBrowserFetch } from "../infrastructure/security/index.js";
import { CUSTOMER_DASHBOARD_COPY_FA } from "./index.js";

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

export type PortalMeDto = {
  storeId: string;
  storeSlug: string;
  storeDisplayName: string;
  membership: {
    id: string;
    phoneNational: string;
    status: string;
    joinedAt: string;
  } | null;
  phoneMasked: string;
  engagement: {
    purchaseCount: number;
    totalSpendDisplayToman: string;
    lastPurchaseAt: string | null;
    segment: string;
  } | null;
};

export type PortalOrderDto = {
  id: string;
  status: string;
  fulfillmentMode: string;
  totalDisplayToman: string;
  pendingPaymentAt: string;
  readyForPickupAt: string | null;
  completedAt: string | null;
  lines: Array<{ productName: string; quantity: number }>;
};

export type PortalReceiptDto = {
  id: string;
  receiptRef: string;
  totalDisplayToman: string;
  completedAt: string | null;
  downloadUrl: string | null;
};

export async function fetchPortalMe(storeSlug: string): Promise<PortalMeDto> {
  const res = await fetch(
    `/api/v1/storefront/${encodeURIComponent(storeSlug)}/me`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<PortalMeDto>(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, CUSTOMER_DASHBOARD_COPY_FA.errorRetry));
  }
  if (!body.data) throw new Error(CUSTOMER_DASHBOARD_COPY_FA.errorRetry);
  return body.data;
}

export async function fetchPortalOrders(
  storeSlug: string,
): Promise<{ orders: PortalOrderDto[] }> {
  const res = await fetch(
    `/api/v1/storefront/${encodeURIComponent(storeSlug)}/me/orders`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{ orders: PortalOrderDto[] }>(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, CUSTOMER_DASHBOARD_COPY_FA.errorRetry));
  }
  return { orders: body.data?.orders ?? [] };
}

export async function fetchPortalRewards(
  storeSlug: string,
): Promise<{ rewards: Array<{ id: string; titleFa: string }> }> {
  const res = await fetch(
    `/api/v1/storefront/${encodeURIComponent(storeSlug)}/me/rewards`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{
    rewards: Array<{ id: string; titleFa: string }>;
  }>(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, CUSTOMER_DASHBOARD_COPY_FA.errorRetry));
  }
  return { rewards: body.data?.rewards ?? [] };
}

export async function fetchPortalReceipts(
  storeSlug: string,
): Promise<{ receipts: PortalReceiptDto[] }> {
  const res = await fetch(
    `/api/v1/storefront/${encodeURIComponent(storeSlug)}/me/receipts`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{ receipts: PortalReceiptDto[] }>(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, CUSTOMER_DASHBOARD_COPY_FA.errorRetry));
  }
  return { receipts: body.data?.receipts ?? [] };
}

export async function logoutCustomer(): Promise<void> {
  const res = await fetch("/api/v1/customer/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
  });
  const body = await parseJson<{ ok?: boolean }>(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, CUSTOMER_DASHBOARD_COPY_FA.errorRetry));
  }
}
