/**
 * ADR-121 — Merchant onboarding + active-store HTTP clients.
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import type { MerchantStoreDto } from "../../store/ui/api.js";
import {
  ONBOARDING_UI_COPY_FA,
  STORE_SWITCHER_UI_COPY_FA,
} from "./copy.js";

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

function csrfJsonHeaders(): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const [k, v] of Object.entries(csrfHeadersForBrowserFetch())) {
    headers.set(k, v);
  }
  return headers;
}

export type MerchantDto = {
  id: string;
  tradeName: string;
  slug: string;
  status: string;
};

export type OnboardingStatusDto = {
  step: "merchant" | "store" | "branding" | "ready";
  complete: boolean;
  merchant: MerchantDto | null;
  store: MerchantStoreDto | null;
  stores?: MerchantStoreDto[];
  storefrontPath: string | null;
  checklist: {
    merchantCreated: boolean;
    storeWithGeo: boolean;
    brandingReady: boolean;
    storefrontReady: boolean;
    firstSaleWithPhone: boolean;
  };
  slugPolicy: string;
};

export async function fetchOnboardingStatus(): Promise<OnboardingStatusDto> {
  const res = await fetch("/api/v1/merchants/me/onboarding", {
    credentials: "same-origin",
  });
  const body = await parseJson<OnboardingStatusDto>(res);
  if (!res.ok || !body.data) {
    throw new Error(errorMessage(body, ONBOARDING_UI_COPY_FA.loadError));
  }
  return body.data;
}

export async function createMerchant(input: {
  tradeName: string;
  slug: string;
  contactPhone?: string | null;
}): Promise<MerchantDto> {
  const res = await fetch("/api/v1/merchants", {
    method: "POST",
    credentials: "same-origin",
    headers: csrfJsonHeaders(),
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ merchant: MerchantDto }>(res);
  if (!res.ok || !body.data?.merchant) {
    throw new Error(errorMessage(body, ONBOARDING_UI_COPY_FA.networkError));
  }
  return body.data.merchant;
}

export async function createMerchantStore(input: {
  slug: string;
  displayName: string;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    province: string;
    postalCode?: string | null;
    latitude: number;
    longitude: number;
  };
  primaryColor?: string | null;
}): Promise<MerchantStoreDto> {
  const res = await fetch("/api/v1/stores", {
    method: "POST",
    credentials: "same-origin",
    headers: csrfJsonHeaders(),
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ store: MerchantStoreDto }>(res);
  if (!res.ok || !body.data?.store) {
    throw new Error(errorMessage(body, ONBOARDING_UI_COPY_FA.networkError));
  }
  return body.data.store;
}

export async function patchStoreBranding(input: {
  storeId: string;
  displayName?: string;
  primaryColor?: string | null;
}): Promise<MerchantStoreDto> {
  const res = await fetch(`/api/v1/stores/${encodeURIComponent(input.storeId)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: csrfJsonHeaders(),
    body: JSON.stringify({
      ...(input.displayName !== undefined
        ? { displayName: input.displayName }
        : {}),
      ...(input.primaryColor !== undefined
        ? { primaryColor: input.primaryColor }
        : {}),
    }),
  });
  const body = await parseJson<{ store: MerchantStoreDto }>(res);
  if (!res.ok || !body.data?.store) {
    throw new Error(errorMessage(body, ONBOARDING_UI_COPY_FA.networkError));
  }
  return body.data.store;
}

export async function completeOnboarding(): Promise<{
  storefrontPath: string;
  store: MerchantStoreDto;
}> {
  const res = await fetch("/api/v1/merchants/me/onboarding/complete", {
    method: "POST",
    credentials: "same-origin",
    headers: csrfJsonHeaders(),
    body: JSON.stringify({}),
  });
  const body = await parseJson<{
    storefrontPath: string;
    store: MerchantStoreDto;
  }>(res);
  if (!res.ok || !body.data?.store) {
    throw new Error(errorMessage(body, ONBOARDING_UI_COPY_FA.networkError));
  }
  return body.data;
}

export type ActiveStoreResponse = {
  activeStoreId: string | null;
  store: MerchantStoreDto | null;
  stores: MerchantStoreDto[];
};

export async function fetchActiveStore(): Promise<ActiveStoreResponse> {
  const res = await fetch("/api/v1/stores/active", {
    credentials: "same-origin",
  });
  const body = await parseJson<ActiveStoreResponse>(res);
  if (!res.ok || !body.data) {
    throw new Error(
      errorMessage(body, STORE_SWITCHER_UI_COPY_FA.switchError),
    );
  }
  return body.data;
}

export async function setActiveStore(
  storeId: string,
): Promise<ActiveStoreResponse> {
  const res = await fetch("/api/v1/stores/active", {
    method: "PUT",
    credentials: "same-origin",
    headers: csrfJsonHeaders(),
    body: JSON.stringify({ storeId }),
  });
  const body = await parseJson<ActiveStoreResponse>(res);
  if (!res.ok || !body.data) {
    throw new Error(
      errorMessage(body, STORE_SWITCHER_UI_COPY_FA.switchError),
    );
  }
  // GET again so stores[] is present for UI switchers
  return fetchActiveStore();
}
