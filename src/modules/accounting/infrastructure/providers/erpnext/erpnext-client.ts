/**
 * ERPNext / Frappe REST client (ADR-140).
 * Lives only under infrastructure/providers/erpnext — never import from core domains.
 */

export type ErpNextHttpRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
};

export type ErpNextHttpResponse = {
  status: number;
  json: unknown;
};

export type ErpNextFetch = (input: ErpNextHttpRequest) => Promise<ErpNextHttpResponse>;

export type ErpNextClientConfig = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  timeoutMs: number;
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
};

export class ErpNextHttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ErpNextHttpError";
    this.status = status;
    this.body = body;
  }
}

function joinUrl(baseUrl: string, path: string, query?: Record<string, string>): string {
  const base = baseUrl.replace(/\/+$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${rel}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export function createErpNextFetch(config: ErpNextClientConfig): ErpNextFetch {
  const fetchImpl = config.fetchImpl ?? fetch;
  const auth = `token ${config.apiKey}:${config.apiSecret}`;

  return async function erpNextFetch(input: ErpNextHttpRequest): Promise<ErpNextHttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const res = await fetchImpl(joinUrl(config.baseUrl, input.path, input.query), {
        method: input.method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: auth,
        },
        ...(input.body === undefined
          ? {}
          : { body: JSON.stringify(input.body) }),
        signal: controller.signal,
      });
      const text = await res.text();
      let json: unknown = null;
      if (text) {
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          json = { raw: text };
        }
      }
      return { status: res.status, json };
    } finally {
      clearTimeout(timer);
    }
  };
}

export type ErpNextClient = {
  getList(doctype: string, opts?: {
    fields?: string[];
    filters?: unknown[];
    limit?: number;
  }): Promise<Record<string, unknown>[]>;
  getDoc(doctype: string, name: string): Promise<Record<string, unknown> | null>;
  createDoc(doctype: string, doc: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateDoc(
    doctype: string,
    name: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  submitDoc(doctype: string, name: string): Promise<Record<string, unknown>>;
  callMethod(method: string, args?: Record<string, unknown>): Promise<unknown>;
};

function dataOf(json: unknown): unknown {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: unknown }).data;
  }
  return json;
}

export function createErpNextClient(fetchFn: ErpNextFetch): ErpNextClient {
  async function ensureOk(res: ErpNextHttpResponse, action: string): Promise<unknown> {
    if (res.status >= 200 && res.status < 300) {
      return dataOf(res.json);
    }
    throw new ErpNextHttpError(
      `ERPNext ${action} failed (${res.status})`,
      res.status,
      res.json,
    );
  }

  return {
    async getList(doctype, opts = {}) {
      const query: Record<string, string> = {
        fields: JSON.stringify(opts.fields ?? ["name"]),
        limit_page_length: String(opts.limit ?? 20),
      };
      if (opts.filters) {
        query.filters = JSON.stringify(opts.filters);
      }
      const res = await fetchFn({
        method: "GET",
        path: `/api/resource/${encodeURIComponent(doctype)}`,
        query,
      });
      const data = await ensureOk(res, `list ${doctype}`);
      return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    },

    async getDoc(doctype, name) {
      const res = await fetchFn({
        method: "GET",
        path: `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      });
      if (res.status === 404) return null;
      const data = await ensureOk(res, `get ${doctype}/${name}`);
      return (data as Record<string, unknown>) ?? null;
    },

    async createDoc(doctype, doc) {
      const res = await fetchFn({
        method: "POST",
        path: `/api/resource/${encodeURIComponent(doctype)}`,
        body: doc,
      });
      const data = await ensureOk(res, `create ${doctype}`);
      return data as Record<string, unknown>;
    },

    async updateDoc(doctype, name, patch) {
      const res = await fetchFn({
        method: "PUT",
        path: `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
        body: patch,
      });
      const data = await ensureOk(res, `update ${doctype}/${name}`);
      return data as Record<string, unknown>;
    },

    async submitDoc(doctype, name) {
      const doc = await this.getDoc(doctype, name);
      if (!doc) {
        throw new ErpNextHttpError(`Cannot submit missing ${doctype}/${name}`, 404, null);
      }
      if (Number(doc.docstatus) === 1) {
        return doc;
      }
      const res = await fetchFn({
        method: "POST",
        path: "/api/method/frappe.client.submit",
        body: { doc },
      });
      const data = await ensureOk(res, `submit ${doctype}/${name}`);
      if (data && typeof data === "object") {
        return data as Record<string, unknown>;
      }
      const refreshed = await this.getDoc(doctype, name);
      if (!refreshed) {
        throw new ErpNextHttpError(`Submit lost ${doctype}/${name}`, 500, data);
      }
      return refreshed;
    },

    async callMethod(method, args = {}) {
      const res = await fetchFn({
        method: "POST",
        path: `/api/method/${method}`,
        body: args,
      });
      return ensureOk(res, `method ${method}`);
    },
  };
}

export function mosEventMarker(eventId: string): string {
  return `mos_event:${eventId}`;
}

export function minorToErpRate(amountMinor: string): number {
  const n = Number(amountMinor);
  if (!Number.isFinite(n)) return 0;
  return n;
}
