"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { DeleteDialog } from "@/components/composites/confirm-dialog";
import { FormSection } from "@/components/composites/form-section";
import { LoadingState } from "@/components/composites/loading-state";
import { SectionHeader } from "@/components/composites/section-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const [deleteOpen, setDeleteOpen] = useState(false);

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
    return <LoadingState rows={2} label={fa.loadingProducts} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {productId ? (
        <Button variant="outline" size="sm" className="w-fit" asChild>
          <Link href="/products">{fa.backToList}</Link>
        </Button>
      ) : null}

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
        <FormSection title={fa.nameLabel}>
          <div className="space-y-2">
            <Label htmlFor={nameId}>{fa.nameLabel}</Label>
            <Input
              id={nameId}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={barcodeId}>{fa.barcodeLabel}</Label>
            <Input
              id={barcodeId}
              required
              inputMode="numeric"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={skuId}>{fa.skuLabel}</Label>
            <Input
              id={skuId}
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={priceId}>{fa.priceTomanLabel}</Label>
            <Input
              id={priceId}
              required
              inputMode="numeric"
              value={priceToman}
              onChange={(e) => setPriceToman(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">{fa.priceHint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={categoryId}>{fa.categoryLabel}</Label>
            <Select
              value={selectedCategoryId || "__none__"}
              onValueChange={(v) =>
                setSelectedCategoryId(v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger id={categoryId}>
                <SelectValue placeholder={fa.categoryNone} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="__none__">{fa.categoryNone}</SelectItem>
                {(categoriesQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={descId}>{fa.descriptionLabel}</Label>
            <Textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {!productId ? (
            <div className="space-y-2">
              <Label htmlFor={stockId}>{fa.initialStockLabel}</Label>
              <Input
                id={stockId}
                inputMode="numeric"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                placeholder="0"
              />
            </div>
          ) : null}
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? fa.saving : fa.saveProduct}
          </Button>
          {productId ? (
            <>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteOpen(true)}
              >
                {fa.softDelete}
              </Button>
              <DeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={fa.softDelete}
                description={fa.softDeleteConfirm}
                onConfirm={() => deleteMutation.mutate()}
              />
            </>
          ) : null}
        </FormSection>
      </form>

      <section className="flex flex-col gap-3">
        <SectionHeader title={fa.categoriesTitle} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Label htmlFor={categoryNameId} className="sr-only">
            {fa.categoryNameLabel}
          </Label>
          <Input
            id={categoryNameId}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={fa.categoryNameLabel}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!newCategoryName.trim() || categoryMutation.isPending}
            onClick={() => categoryMutation.mutate()}
          >
            {fa.addCategory}
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {(categoriesQuery.data ?? []).map((c) => (
            <li
              key={c.id}
              className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <span>{c.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => deleteCategoryMutation.mutate(c.id)}
              >
                {fa.deleteCategory}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <div aria-live="polite" className="flex flex-col gap-2">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
