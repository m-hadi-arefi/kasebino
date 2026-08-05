"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { fetchProducts } from "@/modules/catalog/ui/api";
import { CATALOG_UI_COPY_FA } from "@/modules/catalog/ui/copy";
import { formatCatalogToman } from "@/modules/catalog/ui/format";

const fa = CATALOG_UI_COPY_FA;

export function ProductsListClient() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  const productsQuery = useQuery({
    queryKey: ["catalog", "products", debounced],
    queryFn: () => fetchProducts(debounced || undefined),
  });

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/dashboard"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.backToDashboard}
        </Link>
        <Link
          href="/inventory"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openInventory}
        </Link>
        <Link
          href="/pos"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openPos}
        </Link>
      </nav>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor={searchId} className="sr-only">
          {fa.searchPlaceholder}
        </label>
        <input
          id={searchId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fa.searchPlaceholder}
          className="min-h-11 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
        />
        <Link
          href="/products/new"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 font-medium text-[var(--color-primary-fg)]"
        >
          {fa.addProduct}
        </Link>
      </div>

      {productsQuery.isLoading ? (
        <p className="text-[var(--color-muted)]">{fa.loadingProducts}</p>
      ) : null}

      {productsQuery.isError ? (
        <p className="text-[var(--color-danger)]" role="alert">
          {(productsQuery.error as Error).message || fa.networkError}
        </p>
      ) : null}

      {!productsQuery.isLoading &&
      (productsQuery.data?.length ?? 0) === 0 ? (
        <p className="text-[var(--color-muted)]">{fa.emptyProducts}</p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {(productsQuery.data ?? []).map((p) => (
          <li key={p.id}>
            <Link
              href={`/products/${p.id}`}
              className="block min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <p className="font-medium text-[var(--color-fg)]">{p.name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {p.barcode} · {formatCatalogToman(p.priceAmountMinor)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
