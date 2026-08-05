/**
 * ADR-104 merchant store HTTP clients (location + QR meta).
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import {
  STORE_LOCATION_UI_COPY_FA,
  STORE_QR_PRINT_UI_COPY_FA,
} from "./copy.js";

export type MerchantStoreAddressDto = {
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  displayAddress: string;
  latitude: number;
  longitude: number;
};

export type MerchantStoreDto = {
  id: string;
  merchantId: string;
  slug: string;
  status: string;
  branding: {
    displayName: string;
    logoObjectKey: string | null;
    primaryColor: string | null;
  };
  address: MerchantStoreAddressDto;
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

export async function fetchMerchantStore(
  storeId: string,
): Promise<MerchantStoreDto> {
  const res = await fetch(`/api/v1/stores/${encodeURIComponent(storeId)}`, {
    credentials: "same-origin",
  });
  const body = await parseJson<{ store: MerchantStoreDto }>(res);
  if (!res.ok || !body.data?.store) {
    throw new Error(errorMessage(body, STORE_LOCATION_UI_COPY_FA.loadError));
  }
  return body.data.store;
}

export async function listMerchantStores(): Promise<MerchantStoreDto[]> {
  const res = await fetch("/api/v1/stores", { credentials: "same-origin" });
  const body = await parseJson<{ stores: MerchantStoreDto[] }>(res);
  if (!res.ok || !body.data?.stores) {
    throw new Error(errorMessage(body, STORE_LOCATION_UI_COPY_FA.loadError));
  }
  return body.data.stores;
}

export async function patchStoreLocation(input: {
  storeId: string;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    province: string;
    postalCode?: string | null;
    latitude: number;
    longitude: number;
  };
}): Promise<MerchantStoreDto> {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const [k, v] of Object.entries(csrfHeadersForBrowserFetch())) {
    headers.set(k, v);
  }
  const res = await fetch(`/api/v1/stores/${encodeURIComponent(input.storeId)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers,
    body: JSON.stringify({ address: input.address }),
  });
  const body = await parseJson<{ store: MerchantStoreDto }>(res);
  if (!res.ok || !body.data?.store) {
    throw new Error(
      errorMessage(body, STORE_LOCATION_UI_COPY_FA.networkError),
    );
  }
  return body.data.store;
}

export type StoreQrMetaDto = {
  storeId: string;
  slug: string;
  targetUrl: string;
  contentType: string;
  pngBase64: string;
  imagePath: string;
};

export async function fetchStoreQrMeta(
  storeId: string,
): Promise<StoreQrMetaDto> {
  const res = await fetch(`/api/v1/stores/${encodeURIComponent(storeId)}/qr`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const body = await parseJson<StoreQrMetaDto>(res);
  if (!res.ok || !body.data?.pngBase64) {
    throw new Error(errorMessage(body, STORE_QR_PRINT_UI_COPY_FA.loadError));
  }
  return body.data;
}

/** Upload store logo/icon to MinIO media bucket (ADR-111). */
export async function uploadStoreBrandingAsset(input: {
  storeId: string;
  kind: "logo" | "icon";
  file: File;
}): Promise<MerchantStoreDto> {
  const buf = new Uint8Array(await input.file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.byteLength; i += 1) {
    binary += String.fromCharCode(buf[i]!);
  }
  const dataBase64 = btoa(binary);
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const [k, v] of Object.entries(csrfHeadersForBrowserFetch())) {
    headers.set(k, v);
  }
  const res = await fetch(
    `/api/v1/stores/${encodeURIComponent(input.storeId)}/assets`,
    {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify({
        kind: input.kind,
        contentType: input.file.type || "image/png",
        dataBase64,
        filename: input.file.name,
      }),
    },
  );
  const body = await parseJson<{ store: MerchantStoreDto }>(res);
  if (!res.ok || !body.data?.store) {
    throw new Error(errorMessage(body, "بارگذاری لوگو ناموفق بود."));
  }
  return body.data.store;
}
