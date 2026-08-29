"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/composites/empty-state";
import { LoadingState } from "@/components/composites/loading-state";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fetchStockMovements,
  type StockMovementDto,
} from "@/modules/catalog/ui/api";
import { CATALOG_UI_COPY_FA } from "@/modules/catalog/ui/copy";
import { formatInventoryJalali } from "@/modules/catalog/ui/format";

const fa = CATALOG_UI_COPY_FA;

type StockMovementsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  productId: string;
  productName: string;
};

export function StockMovementsSheet({
  open,
  onOpenChange,
  storeId,
  productId,
  productName,
}: StockMovementsSheetProps) {
  const movementsQuery = useInfiniteQuery({
    queryKey: ["catalog", "movements", storeId, productId],
    enabled: open && Boolean(storeId) && Boolean(productId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchStockMovements({
        storeId,
        productId,
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items: StockMovementDto[] =
    movementsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle>{fa.movementsTitle}</SheetTitle>
          <SheetDescription>{productName}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-3">
          {movementsQuery.isLoading ? (
            <LoadingState rows={3} label={fa.movementsLoading} />
          ) : null}

          {!movementsQuery.isLoading && items.length === 0 ? (
            <EmptyState title={fa.movementsEmpty} />
          ) : null}

          <ul className="flex flex-col gap-2">
            {items.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <p className="font-medium">{m.reasonDisplayFa}</p>
                <p className="text-muted-foreground">
                  {fa.movementsDelta}:{" "}
                  <span dir="ltr">
                    {m.quantityDelta > 0 ? "+" : ""}
                    {m.quantityDelta.toLocaleString("fa-IR")}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatInventoryJalali(m.occurredAt)}
                </p>
                {m.note ? (
                  <p className="text-xs text-muted-foreground mt-1">{m.note}</p>
                ) : null}
              </li>
            ))}
          </ul>

          {movementsQuery.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              disabled={movementsQuery.isFetchingNextPage}
              onClick={() => void movementsQuery.fetchNextPage()}
            >
              {fa.movementsLoadMore}
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
