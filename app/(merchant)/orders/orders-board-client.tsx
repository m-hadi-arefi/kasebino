"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";

import { ConfirmDialog } from "@/components/composites/confirm-dialog";
import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { FilterBar } from "@/components/composites/filter-bar";
import { LoadingState } from "@/components/composites/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BOARD_OPEN_STATUSES,
  BOARD_POLL_INTERVAL_MS,
  ORDERS_UI_COPY_FA,
  canCancelOrder,
  canRefundOrder,
  fetchMerchantStores,
  fetchStoreOrders,
  filterOrdersByStatus,
  formatOrdersJalali,
  primaryActionForStatus,
  readyHoldHintFa,
  readyHoldSignal,
  statusLabelFa,
  summarizeLinesFa,
  transitionOrder,
  type BoardStatusFilter,
  type OrderDto,
  type OrderTransitionAction,
} from "@/modules/ordering/ui";
import { REALTIME_CLIENT_UX_FA } from "@/infrastructure/emqx/realtime-client/ux";
import { useRealtimeStoreChannel } from "@/infrastructure/emqx/realtime-client/use-realtime-store-channel";

const fa = ORDERS_UI_COPY_FA;

const STATUS_FILTERS: { id: BoardStatusFilter; label: string }[] = [
  { id: "open", label: fa.filterAllOpen },
  { id: "paid", label: fa.statusPaid },
  { id: "preparing", label: fa.statusPreparing },
  { id: "ready_for_pickup", label: fa.statusReady },
  { id: "picked_up", label: fa.statusPickedUp },
  { id: "pending_payment", label: fa.statusPending },
  { id: "all", label: fa.filterAll },
];

type PendingConfirm = {
  order: OrderDto;
  action: OrderTransitionAction;
  description: string;
};

export function OrdersBoardClient() {
  const storeSelectId = useId();
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [statusFilter, setStatusFilter] = useState<BoardStatusFilter>("open");
  const [banner, setBanner] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );

  const storesQuery = useQuery({
    queryKey: ["orders", "stores"],
    queryFn: fetchMerchantStores,
  });

  useEffect(() => {
    if (!selectedStoreId && (storesQuery.data?.length ?? 0) > 0) {
      setSelectedStoreId(storesQuery.data![0]!.id);
    }
  }, [selectedStoreId, storesQuery.data]);

  const selectedStore = (storesQuery.data ?? []).find(
    (s) => s.id === selectedStoreId,
  );

  const realtime = useRealtimeStoreChannel({
    merchantId: selectedStore?.merchantId,
    storeId: selectedStoreId || null,
    channels: ["orders", "notifications"],
    onEventToast: (message) => {
      setLiveToast(message);
      window.setTimeout(() => setLiveToast(null), 4_000);
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", "list", selectedStoreId],
    queryFn: () => fetchStoreOrders(selectedStoreId),
    enabled: Boolean(selectedStoreId),
    refetchInterval:
      realtime.state === "connected"
        ? BOARD_POLL_INTERVAL_MS * 2
        : BOARD_POLL_INTERVAL_MS,
  });

  const transitionMutation = useMutation({
    mutationFn: (input: {
      orderId: string;
      action: OrderTransitionAction;
      reason?: string;
    }) =>
      transitionOrder(input.orderId, input.action, {
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
      }),
    onMutate: (vars) => {
      setActingId(vars.orderId);
      setBanner(null);
    },
    onSuccess: async () => {
      setBanner({ kind: "success", text: fa.actionSuccess });
      await queryClient.invalidateQueries({
        queryKey: ["orders", "list", selectedStoreId],
      });
    },
    onError: (error: Error) => {
      setBanner({
        kind: "error",
        text: error.message || fa.actionErrorFallback,
      });
    },
    onSettled: () => {
      setActingId(null);
    },
  });

  const filtered = filterOrdersByStatus(
    ordersQuery.data ?? [],
    statusFilter,
  )
    .slice()
    .sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  function executeAction(order: OrderDto, action: OrderTransitionAction) {
    transitionMutation.mutate({
      orderId: order.id,
      action,
      ...(action === "cancel" ? { reason: "staff_cancel" } : {}),
    });
  }

  function runAction(
    order: OrderDto,
    action: OrderTransitionAction,
    confirmMessage?: string,
  ) {
    if (confirmMessage) {
      setPendingConfirm({ order, action, description: confirmMessage });
      return;
    }
    executeAction(order, action);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {fa.currencyHint} · {fa.fulfillmentHint}
      </p>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {realtime.state === "connected"
          ? fa.realtimeConnected
          : realtime.state === "poll_fallback" || !realtime.mqttEnabled
            ? fa.realtimePolling
            : fa.realtimeReconnecting}
        {" · "}
        {fa.pollHint}
        {ordersQuery.dataUpdatedAt
          ? ` · ${fa.lastPolled}: ${formatOrdersJalali(new Date(ordersQuery.dataUpdatedAt).toISOString())}`
          : null}
      </p>
      {liveToast ? (
        <Alert>
          <AlertDescription
            role="status"
            aria-live="polite"
            dir={REALTIME_CLIENT_UX_FA.dir}
          >
            {liveToast}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={storeSelectId}>{fa.storeLabel}</Label>
        <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
          <SelectTrigger id={storeSelectId}>
            <SelectValue placeholder={fa.storePlaceholder} />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {(storesQuery.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div role="group" aria-label={fa.filterLabel}>
        <FilterBar
          trailing={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void ordersQuery.refetch()}
            >
              {fa.refreshNow}
            </Button>
          }
        >
          {STATUS_FILTERS.map((f) => {
            const pressed = statusFilter === f.id;
            return (
              <Button
                key={f.id}
                type="button"
                variant={pressed ? "default" : "outline"}
                size="sm"
                aria-pressed={pressed}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </Button>
            );
          })}
        </FilterBar>
      </div>

      {banner ? (
        <Alert variant={banner.kind === "error" ? "destructive" : "default"}>
          <AlertDescription role="status" aria-live="polite">
            {banner.text}
          </AlertDescription>
        </Alert>
      ) : null}

      {storesQuery.isError || ordersQuery.isError ? (
        <ErrorState title={fa.networkError} />
      ) : null}

      {ordersQuery.isLoading || storesQuery.isLoading ? (
        <LoadingState rows={3} label={fa.loading} />
      ) : null}

      {!ordersQuery.isLoading && selectedStoreId && filtered.length === 0 ? (
        <EmptyState
          title={
            statusFilter === "open" || statusFilter === "all"
              ? fa.empty
              : fa.emptyFilter
          }
        />
      ) : null}

      <ul className="flex flex-col gap-3" aria-label={fa.boardTitle}>
        {filtered.map((order) => {
          const primary = primaryActionForStatus(order.status);
          const hold = readyHoldSignal(order);
          const holdHint = readyHoldHintFa(hold);
          const busy = actingId === order.id;

          return (
            <li key={order.id}>
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline">{statusLabelFa(order.status)}</Badge>
                    <p className="text-sm text-muted-foreground">
                      {fa.createdLabel}: {formatOrdersJalali(order.createdAt)}
                    </p>
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    {order.totalDisplayToman}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">
                      {fa.linesLabel}:{" "}
                    </span>
                    {summarizeLinesFa(order)}
                  </p>
                  {order.status === "pending_payment" ? (
                    <p className="text-amber-800">{fa.unpaidHint}</p>
                  ) : null}
                  {holdHint ? (
                    <p
                      className={
                        hold === "expired" || hold === "urgent"
                          ? "font-medium text-amber-900"
                          : "text-muted-foreground"
                      }
                    >
                      {holdHint}
                    </p>
                  ) : null}
                  {order.cancelReason ? (
                    <p className="text-muted-foreground">
                      {fa.cancelReasonLabel}: {order.cancelReason}
                    </p>
                  ) : null}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  {primary ? (
                    <Button
                      type="button"
                      disabled={busy}
                      className="min-h-11 w-full"
                      onClick={() => runAction(order, primary.action)}
                    >
                      {busy ? fa.acting : primary.label}
                    </Button>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {canCancelOrder(order.status) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          runAction(order, "cancel", fa.cancelConfirm)
                        }
                      >
                        {fa.actionCancel}
                      </Button>
                    ) : null}
                    {canRefundOrder(order.status, order.paidAt) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          runAction(order, "refund", fa.refundConfirm)
                        }
                      >
                        {fa.actionRefund}
                      </Button>
                    ) : null}
                  </div>
                </CardFooter>
              </Card>
            </li>
          );
        })}
      </ul>

      <span className="sr-only">
        {BOARD_OPEN_STATUSES.map((s) => statusLabelFa(s)).join(" · ")}
      </span>

      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
        title={fa.boardTitle}
        description={pendingConfirm?.description ?? ""}
        onConfirm={() => {
          if (pendingConfirm) {
            executeAction(pendingConfirm.order, pendingConfirm.action);
          }
          setPendingConfirm(null);
        }}
      />
    </div>
  );
}
