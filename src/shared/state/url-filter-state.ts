/**
 * URL-owned filter / deep-link state (ADR-025).
 * Keeps Persian query values intact via standard URLSearchParams UTF-8 encoding.
 */

export type FilterState = {
  readonly q?: string;
  readonly sort?: string;
  readonly page?: number;
  readonly pageSize?: number;
  /** Extra domain keys (category, status, …) as string values. */
  readonly extras?: Readonly<Record<string, string>>;
};

const RESERVED = new Set(["q", "sort", "page", "pageSize"]);

/** Parse list filters from a query string or URLSearchParams. */
export function parseFilterSearchParams(
  input: string | URLSearchParams,
): FilterState {
  const params =
    typeof input === "string" ? new URLSearchParams(input) : input;

  const q = params.get("q") ?? undefined;
  const sort = params.get("sort") ?? undefined;
  const pageRaw = params.get("page");
  const pageSizeRaw = params.get("pageSize");

  const page =
    pageRaw !== null && pageRaw !== ""
      ? Number.parseInt(pageRaw, 10)
      : undefined;
  const pageSize =
    pageSizeRaw !== null && pageSizeRaw !== ""
      ? Number.parseInt(pageSizeRaw, 10)
      : undefined;

  const extras: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!RESERVED.has(key)) {
      extras[key] = value;
    }
  }

  return {
    ...(q !== undefined ? { q } : {}),
    ...(sort !== undefined ? { sort } : {}),
    ...(page !== undefined && Number.isFinite(page) ? { page } : {}),
    ...(pageSize !== undefined && Number.isFinite(pageSize)
      ? { pageSize }
      : {}),
    ...(Object.keys(extras).length > 0 ? { extras } : {}),
  };
}

/** Serialize filters to a query string (no leading `?`). */
export function serializeFilterSearchParams(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.q !== undefined && state.q !== "") {
    params.set("q", state.q);
  }
  if (state.sort !== undefined && state.sort !== "") {
    params.set("sort", state.sort);
  }
  if (state.page !== undefined) {
    params.set("page", String(state.page));
  }
  if (state.pageSize !== undefined) {
    params.set("pageSize", String(state.pageSize));
  }
  if (state.extras) {
    for (const [key, value] of Object.entries(state.extras)) {
      if (!RESERVED.has(key) && value !== "") {
        params.set(key, value);
      }
    }
  }
  return params.toString();
}
