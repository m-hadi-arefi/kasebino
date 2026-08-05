/**
 * ADR-098 merchant CRM HTTP client (session cookies).
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import type { CrmSegment } from "../domain/segments.js";

export type CrmStoreDto = {
  id: string;
  merchantId: string;
  displayName: string;
  slug: string;
};

export type CrmMembershipDto = {
  id: string;
  merchantId: string;
  storeId: string;
  customerId: string;
  phoneNational: string;
  source: string;
  status: string;
  joinedAt: string;
  updatedAt: string;
};

export type CrmEngagementDto = {
  purchaseCount: number;
  totalSpendMinor: string;
  totalSpendDisplayToman: string;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  segment: CrmSegment;
};

export type CrmMembershipListItemDto = {
  membership: CrmMembershipDto;
  engagement: CrmEngagementDto;
};

export type CrmSaleDto = {
  id: string;
  receiptRef: string;
  totalAmountMinor: string;
  totalDisplayToman: string;
  tenderType: string;
  completedAt: string | null;
  lines: Array<{
    id: string;
    productName: string;
    quantity: number;
    lineDisplayToman: string;
  }>;
};

export type CrmSegmentsDto = {
  storeId: string;
  totalActive: number;
  counts: Record<CrmSegment, number>;
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

export async function fetchMerchantStores(): Promise<CrmStoreDto[]> {
  const res = await fetch("/api/v1/stores", { credentials: "same-origin" });
  const body = await parseJson<{ stores: CrmStoreDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "stores_failed"));
  return body.data?.stores ?? [];
}

export async function fetchMemberships(input: {
  storeId: string;
  segment?: CrmSegment | "all";
}): Promise<CrmMembershipListItemDto[]> {
  const params = new URLSearchParams({ storeId: input.storeId });
  if (input.segment && input.segment !== "all") {
    params.set("segment", input.segment);
  }
  const res = await fetch(`/api/v1/crm/memberships?${params}`, {
    credentials: "same-origin",
  });
  const body = await parseJson<{ memberships: CrmMembershipListItemDto[] }>(
    res,
  );
  if (!res.ok) throw new Error(errorMessage(body, "memberships_failed"));
  return body.data?.memberships ?? [];
}

export async function fetchMembershipProfile(
  membershipId: string,
): Promise<{
  membership: CrmMembershipDto;
  engagement: CrmEngagementDto;
}> {
  const res = await fetch(`/api/v1/crm/memberships/${membershipId}`, {
    credentials: "same-origin",
  });
  const body = await parseJson<{
    membership: CrmMembershipDto;
    engagement: CrmEngagementDto;
  }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "profile_failed"));
  if (!body.data?.membership || !body.data.engagement) {
    throw new Error("profile_failed");
  }
  return body.data;
}

export async function fetchMembershipHistory(
  membershipId: string,
): Promise<CrmSaleDto[]> {
  const res = await fetch(
    `/api/v1/crm/memberships/${membershipId}/history`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{ sales: CrmSaleDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "history_failed"));
  return body.data?.sales ?? [];
}

export async function fetchStoreSegments(
  storeId: string,
): Promise<CrmSegmentsDto> {
  const res = await fetch(
    `/api/v1/crm/segments?storeId=${encodeURIComponent(storeId)}`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<CrmSegmentsDto>(res);
  if (!res.ok) throw new Error(errorMessage(body, "segments_failed"));
  if (!body.data) throw new Error("segments_failed");
  return body.data;
}

export async function softDeleteMembership(
  membershipId: string,
): Promise<void> {
  const res = await fetch(`/api/v1/crm/memberships/${membershipId}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: {
      ...csrfHeadersForBrowserFetch(),
    },
  });
  const body = await parseJson<{ membership: CrmMembershipDto }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "delete_failed"));
}
