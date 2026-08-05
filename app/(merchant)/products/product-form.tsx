"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import {
  adjustInventory,
  createCategory,
  createProduct,
  fetchCategories,
  fetchMerchantStores,
  fetchProduct,
  softDeleteCategory,
  softDeleteProduct,
  updateProduct,
} from "@/modules/catalog/ui/api";
import { CATALOG_UI_COPY_FA } from "@/modules/catalog/ui/copy";
import { minorToTomanInt, tomanToMinor } from "@/modules/catalog/ui/format";

const fa = CATALOG_UI_COPY_FA;

type ProductFormProps = {
  productId?: string;
};

export function ProductForm({ productId }: ProductFormProps) {
  const nameId = useId();
  const skuId = useId();
  const barcodeId = useId();
  const priceId = useId();
  const descId = useId();
  const categoryId = useId();
  const stockId = useId();
  const categoryNameId = useId();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [priceToman, setPriceToman] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const productQuery = useQuery({
    queryKey: ["catalog", "product", productId],
    queryFn: () => fetchProduct(productId!),
    enabled: Boolean(productId),
  });

  const categoriesQuery = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategories,
  });

  const storesQuery = useQuery({
    queryKey: ["catalog", "stores"],
    queryFn: fetchMerchantStores,
    staleTime: 60_000,
  });

  useEffect(() => {
    const p = productQuery.data;
    if (!p) return;
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode);
    setPriceToman(String(minorToTomanInt(p.priceAmountMinor)));
    setDescription(p.description ?? "");
    setSelectedCategoryId(p.categoryId ?? "");
  }, [productQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const priceAmountMinor = tomanToMinor(Number(priceToman)).toString();
      const payload = {
        name,
        sku,
        barcode,
        priceAmountMinor,
        description: description.trim() ? description.trim() : null,
        categoryId: selectedCategoryId || null,
      };
      if (productId) {
        return updateProduct(productId, payload);
      }
      return createProduct(payload);
    },
    onSuccess: async (product) => {
      setError(null);
      setSuccess(fa.saveSuccess);
      await queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
      await queryClient.invalidateQueries({
        queryKey: ["catalog", "product", product.id],
      });

      const stockQty = Number(initialStock);
      const store = storesQuery.data?.[0];
      if (!productId && store && Number.isInteger(stockQty) && stockQty > 0) {
        await adjustInventory({
          storeId: store.id,
          productId: product.id,
          delta: stockQty,
          createIfMissing: true,
          reason: "initial_stock",
        });
        await queryClient.invalidateQueries({ queryKey: ["catalog", "inventory"] });
      }
    },
    onError: (err: Error) => {
      setSuccess(null);
      setError(err.message || fa.networkError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!productId) return;
      await softDeleteProduct(productId);
    },
    onSuccess: async () => {
      setSuccess(fa.deleteSuccess);
      await queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (err: Error) => {
      setError(err.message || fa.networkError);
    },
  });

  const categoryMutation = useMutation({
    mutationFn: async () => createCategory(newCategoryName.trim()),
    onSuccess: async (cat) => {
      setNewCategoryName("");
      setSelectedCategoryId(cat.id);
      setSuccess(fa.categorySuccess);
      await queryClient.invalidateQueries({ queryKey: ["catalog", "categories"] });
    },
    onError: (err: Error) => setError(err.message || fa.networkError),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => softDeleteCategory(id),
    onSuccess: async () => {
      if (selectedCategoryId) setSelectedCategoryId("");
      await queryClient.invalidateQueries({ queryKey: ["catalog", "categories"] });
    },
    onError: (err: Error) => setError(err.message || fa.networkError),
  });

  if (productId && productQuery.isLoading) {
    return <p className="text-[var(--color-muted)]">{fa.loadingProducts}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/products"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.backToList}
        </Link>
        <Link
          href="/inventory"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openInventory}
        </Link>
      </nav>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          try {
            tomanToMinor(Number(priceToman));
          } catch {
            setError(fa.priceHint);
            return;
          }
          saveMutation.mutate();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="font-medium">
            {fa.nameLabel}
          </label>
          <input
            id={nameId}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={barcodeId} className="font-medium">
            {fa.barcodeLabel}
          </label>
          <input
            id={barcodeId}
            required
            inputMode="numeric"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={skuId} className="font-medium">
            {fa.skuLabel}
          </label>
          <input
            id={skuId}
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={priceId} className="font-medium">
            {fa.priceTomanLabel}
          </label>
          <input
            id={priceId}
            required
            inputMode="numeric"
            value={priceToman}
            onChange={(e) => setPriceToman(e.target.value)}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
          />
          <p className="text-sm text-[var(--color-muted)]">{fa.priceHint}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={categoryId} className="font-medium">
            {fa.categoryLabel}
          </label>
          <select
            id={categoryId}
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
          >
            <option value="">{fa.categoryNone}</option>
            {(categoriesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={descId} className="font-medium">
            {fa.descriptionLabel}
          </label>
          <textarea
            id={descId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base"
          />
        </div>

        {!productId ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={stockId} className="font-medium">
              {fa.initialStockLabel}
            </label>
            <input
              id={stockId}
              inputMode="numeric"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              placeholder="0"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 font-medium text-[var(--color-primary-fg)]"
        >
          {saveMutation.isPending ? fa.saving : fa.saveProduct}
        </button>

        {productId ? (
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(fa.softDeleteConfirm)) {
                deleteMutation.mutate();
              }
            }}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-danger)] px-4 py-2.5 text-[var(--color-danger)]"
          >
            {fa.softDelete}
          </button>
        ) : null}
      </form>

      <section className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
        <h2 className="text-lg font-medium">{fa.categoriesTitle}</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor={categoryNameId} className="sr-only">
            {fa.categoryNameLabel}
          </label>
          <input
            id={categoryNameId}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={fa.categoryNameLabel}
            className="min-h-11 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
          />
          <button
            type="button"
            disabled={!newCategoryName.trim() || categoryMutation.isPending}
            onClick={() => categoryMutation.mutate()}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2"
          >
            {fa.addCategory}
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {(categoriesQuery.data ?? []).map((c) => (
            <li
              key={c.id}
              className="flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
            >
              <span>{c.name}</span>
              <button
                type="button"
                className="text-sm text-[var(--color-danger)]"
                onClick={() => deleteCategoryMutation.mutate(c.id)}
              >
                {fa.deleteCategory}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div aria-live="polite" className="text-sm">
        {error ? <p className="text-[var(--color-danger)]">{error}</p> : null}
        {success ? (
          <p className="text-[var(--color-success)]">{success}</p>
        ) : null}
      </div>
    </div>
  );
}
