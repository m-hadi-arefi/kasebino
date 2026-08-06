"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { SearchInput } from "@/components/composites/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchProducts } from "@/modules/catalog/ui/api";
import { CATALOG_UI_COPY_FA } from "@/modules/catalog/ui/copy";
import { formatCatalogToman } from "@/modules/catalog/ui/format";

const fa = CATALOG_UI_COPY_FA;

export function ProductsListClient() {
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fa.searchPlaceholder}
          containerClassName="max-w-none flex-1"
        />
        <Button asChild className="min-h-11 shrink-0">
          <Link href="/products/new">{fa.addProduct}</Link>
        </Button>
      </div>

      {productsQuery.isLoading ? (
        <LoadingState rows={3} label={fa.loadingProducts} />
      ) : null}

      {productsQuery.isError ? (
        <ErrorState
          title={(productsQuery.error as Error).message || fa.networkError}
        />
      ) : null}

      {!productsQuery.isLoading &&
      !productsQuery.isError &&
      (productsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState
          title={fa.emptyProducts}
          actionLabel={fa.addProduct}
          actionHref="/products/new"
        />
      ) : null}

      <ul className="flex flex-col gap-3">
        {(productsQuery.data ?? []).map((p) => (
          <li key={p.id}>
            <Card className="transition-shadow hover:shadow-md">
              <Link href={`/products/${p.id}`}>
                <CardContent className="flex min-h-11 flex-col justify-center py-4">
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.barcode} · {formatCatalogToman(p.priceAmountMinor)}
                  </p>
                </CardContent>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
