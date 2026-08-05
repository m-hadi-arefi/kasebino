/**
 * ADR-106 admin merchants + audit HTTP clients.
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import { ADMIN_UI_COPY_FA } from "./copy.js";

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; messageFa?: string };
};

export type AdminMerchantDto = {
  id: string;
  tradeName: string;
  status: string;
  slug?: string;
};

export type AdminActionDto = {
  id: string;
  adminUserId: string;
  action: string;
  merchantId: string | null;
  result: string;
  reason: string | null;
  reasonFa: string | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  createdAt: string;
};

async function parseJson<T>(res: Response): Promise<Envelope<T>> {
  return (await res.json()) as Envelope<T>;
}

function errorMessage(body: Envelope<unknown>, fallback: string): string {
  return body.error?.messageFa ?? body.error?.message ?? fallback;
}

export async function fetchAdminMerchants(): Promise<AdminMerchantDto[]> {
  const res = await fetch("/api/v1/admin/merchants", {
    credentials: "same-origin",
  });
  const body = await parseJson<{ merchants: AdminMerchantDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, ADMIN_UI_COPY_FA.error));
  return body.data?.merchants ?? [];
}

export async function activateMerchant(
  merchantId: string,
): Promise<AdminMerchantDto> {
  const res = await fetch(`/api/v1/admin/merchants/${merchantId}/activate`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify({}),
  });
  const body = await parseJson<{ merchant: AdminMerchantDto }>(res);
  if (!res.ok || !body.data?.merchant) {
    throw new Error(errorMessage(body, ADMIN_UI_COPY_FA.error));
  }
  return body.data.merchant;
}

export async function suspendMerchant(
  merchantId: string,
): Promise<AdminMerchantDto> {
  const res = await fetch(`/api/v1/admin/merchants/${merchantId}/suspend`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify({}),
  });
  const body = await parseJson<{ merchant: AdminMerchantDto }>(res);
  if (!res.ok || !body.data?.merchant) {
    throw new Error(errorMessage(body, ADMIN_UI_COPY_FA.error));
  }
  return body.data.merchant;
}

export async function fetchAdminAudit(): Promise<AdminActionDto[]> {
  const res = await fetch("/api/v1/admin/audit", {
    credentials: "same-origin",
  });
  const body = await parseJson<{ actions: AdminActionDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, ADMIN_UI_COPY_FA.auditError));
  return body.data?.actions ?? [];
}
