/**
 * ADR-101 merchant pickup board HTTP client (session cookies).
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import type { OrderStatus } from "../domain/order.js";

export type OrdersStoreDto = {
  id: string;
  merchantId: string;
  displayName: string;
  slug: string;
};

export type OrderLineDto = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: string;
  lineDisplayToman: string;
};

export type OrderDto = {
  id: string;
  merchantId: string;
  storeId: string;
  membershipId: string | null;
  customerId: string | null;
  status: OrderStatus;
  fulfillmentMode: "pickup";
  totalAmountMinor: string;
  totalDisplayToman: string;
  idempotencyKey: string;
  lines: OrderLineDto[];
  pendingPaymentAt: string;
  paidAt: string | null;
  preparingAt: string | null;
  readyForPickupAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderTransitionAction =
  | "preparing"
  | "ready"
  | "picked-up"
  | "complete"
  | "cancel"
  | "refund";

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

export async function fetchMerchantStores(): Promise<OrdersStoreDto[]> {
  const res = await fetch("/api/v1/stores", { credentials: "same-origin" });
  const body = await parseJson<{ stores: OrdersStoreDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "stores_failed"));
  return body.data?.stores ?? [];
}

export async function fetchStoreOrders(storeId: string): Promise<OrderDto[]> {
  const params = new URLSearchParams({ storeId });
  const res = await fetch(`/api/v1/orders?${params}`, {
    credentials: "same-origin",
  });
  const body = await parseJson<{ orders: OrderDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "orders_failed"));
  return body.data?.orders ?? [];
}

export async function transitionOrder(
  orderId: string,
  action: OrderTransitionAction,
  options?: { reason?: string },
): Promise<OrderDto> {
  const path =
    action === "picked-up"
      ? `/api/v1/orders/${orderId}/picked-up`
      : `/api/v1/orders/${orderId}/${action}`;

  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body:
      action === "cancel"
        ? JSON.stringify({ reason: options?.reason ?? "staff_cancel" })
        : JSON.stringify({}),
  });
  const body = await parseJson<{ order: OrderDto }>(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "transition_failed"));
  }
  if (!body.data?.order) {
    throw new Error("transition_failed");
  }
  return body.data.order;
}
