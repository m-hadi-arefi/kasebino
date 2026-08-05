/**
 * ADR-099 loyalty HTTP clients (session cookies).
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import { LOYALTY_UI_COPY_FA } from "./copy.js";

export type LoyaltyStoreDto = {
  id: string;
  merchantId: string;
  displayName: string;
  slug: string;
};

export type LoyaltyPointRuleDto = {
  id: string;
  merchantId: string;
  storeId: string;
  amountMinorPerPoint: string;
  pointsPerUnit: number;
  expiryMonthsAfterLastEarn: number | null;
  updatedAt: string;
};

export type LoyaltyWalletDto = {
  id: string;
  merchantId: string;
  storeId: string;
  membershipId: string;
  customerId: string;
  balance: number;
  lastEarnAt: string | null;
  updatedAt: string;
};

export type LoyaltyLedgerEntryDto = {
  id: string;
  entryType: string;
  points: number;
  createdAt: string;
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

export async function fetchMerchantStores(): Promise<LoyaltyStoreDto[]> {
  const res = await fetch("/api/v1/stores", { credentials: "same-origin" });
  const body = await parseJson<{ stores: LoyaltyStoreDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, LOYALTY_UI_COPY_FA.networkError));
  return body.data?.stores ?? [];
}

export async function fetchLoyaltyRule(
  storeId: string,
): Promise<LoyaltyPointRuleDto | null> {
  const res = await fetch(
    `/api/v1/loyalty/rules?storeId=${encodeURIComponent(storeId)}`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{ rule: LoyaltyPointRuleDto | null }>(res);
  if (!res.ok) throw new Error(errorMessage(body, LOYALTY_UI_COPY_FA.networkError));
  return body.data?.rule ?? null;
}

export async function saveLoyaltyRule(input: {
  storeId: string;
  amountMinorPerPoint: string;
  pointsPerUnit: number;
  expiryMonthsAfterLastEarn: number | null;
}): Promise<LoyaltyPointRuleDto> {
  const res = await fetch("/api/v1/loyalty/rules", {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ rule: LoyaltyPointRuleDto }>(res);
  if (!res.ok) throw new Error(errorMessage(body, LOYALTY_UI_COPY_FA.networkError));
  if (!body.data?.rule) throw new Error(LOYALTY_UI_COPY_FA.networkError);
  return body.data.rule;
}

export async function fetchWalletByMembership(
  membershipId: string,
): Promise<LoyaltyWalletDto | null> {
  const res = await fetch(
    `/api/v1/loyalty/wallets/${encodeURIComponent(membershipId)}`,
    { credentials: "same-origin" },
  );
  if (res.status === 404) return null;
  const body = await parseJson<{ wallet: LoyaltyWalletDto }>(res);
  if (!res.ok) throw new Error(errorMessage(body, LOYALTY_UI_COPY_FA.networkError));
  return body.data?.wallet ?? null;
}

export async function fetchWalletByPhone(input: {
  storeId: string;
  phone: string;
}): Promise<{
  membershipId: string;
  phoneNational: string;
  wallet: LoyaltyWalletDto | null;
}> {
  const params = new URLSearchParams({
    storeId: input.storeId,
    phone: input.phone,
  });
  const res = await fetch(`/api/v1/loyalty/wallets/by-phone?${params}`, {
    credentials: "same-origin",
  });
  const body = await parseJson<{
    membershipId: string;
    phoneNational: string;
    wallet: LoyaltyWalletDto | null;
  }>(res);
  if (!res.ok) throw new Error(errorMessage(body, LOYALTY_UI_COPY_FA.networkError));
  if (!body.data) throw new Error(LOYALTY_UI_COPY_FA.networkError);
  return body.data;
}

export async function redeemPoints(input: {
  storeId: string;
  membershipId: string;
  points: number;
  referenceId?: string;
}): Promise<{ wallet: LoyaltyWalletDto; points: number; created: boolean }> {
  const res = await fetch("/api/v1/loyalty/redeem", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson<{
    wallet: LoyaltyWalletDto;
    points: number;
    created: boolean;
  }>(res);
  if (!res.ok) throw new Error(errorMessage(body, LOYALTY_UI_COPY_FA.networkError));
  if (!body.data) throw new Error(LOYALTY_UI_COPY_FA.networkError);
  return body.data;
}

export async function fetchCustomerStorefrontWallet(storeSlug: string): Promise<{
  storeId: string;
  membershipId: string | null;
  wallet: LoyaltyWalletDto | null;
  ledger: LoyaltyLedgerEntryDto[];
}> {
  const res = await fetch(
    `/api/v1/storefront/${encodeURIComponent(storeSlug)}/wallet`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{
    storeId: string;
    membershipId: string | null;
    wallet: LoyaltyWalletDto | null;
    ledger: LoyaltyLedgerEntryDto[];
  }>(res);
  if (!res.ok) throw new Error(errorMessage(body, LOYALTY_UI_COPY_FA.networkError));
  if (!body.data) throw new Error(LOYALTY_UI_COPY_FA.networkError);
  return body.data;
}
