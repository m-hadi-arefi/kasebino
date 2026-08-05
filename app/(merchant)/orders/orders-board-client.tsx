"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

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
import { REALTIME_CLIENT_UX_FA } from "@/realtime-client/ux";
import { useRealtimeStoreChannel } from "@/realtime-client/use-realtime-store-channel";

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

export function OrdersBoardClient() {
  const storeId = useId();
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [statusFilter, setStatusFilter] = useState<BoardStatusFilter>("open");
  const [banner, setBanner] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);

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
    // Soft poll always; MQTT soft-refreshes via invalidate; poll-only when MQTT off.
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
  ).slice().sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  async function runAction(
    order: OrderDto,
    action: OrderTransitionAction,
    confirmMessage?: string,
  ) {
    if (confirmMessage && typeof window !== "undefined") {
      if (!window.confirm(confirmMessage)) return;
    }
    transitionMutation.mutate({
      orderId: order.id,
      action,
      ...(action === "cancel" ? { reason: "staff_cancel" } : {}),
    });
  }

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
          href="/pos"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openPos}
        </Link>
        <Link
          href="/customers"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openCustomers}
        </Link>
      </nav>

      <p className="text-sm text-[var(--color-muted)]">{fa.currencyHint}</p>
      <p className="text-sm text-[var(--color-muted)]">{fa.fulfillmentHint}</p>
      <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
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
        <p
          className="text-sm font-medium text-[var(--color-fg)]"
          role="status"
          aria-live="polite"
          dir={REALTIME_CLIENT_UX_FA.dir}
        >
          {liveToast}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor={storeId} className="text-sm text-[var(--color-muted)]">
          {fa.storeLabel}
        </label>
        <select
          id={storeId}
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
        >
          {(storesQuery.data?.length ?? 0) === 0 ? (
            <option value="">{fa.storePlaceholder}</option>
          ) : null}
          {(storesQuery.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName}
            </option>
          ))}
        </select>
      </div>

      <div
        role="group"
        aria-label={fa.filterLabel}
        className="flex flex-wrap gap-2"
      >
        {STATUS_FILTERS.map((f) => {
          const pressed = statusFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => setStatusFilter(f.id)}
              className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-2 text-sm ${
                pressed
                  ? "border-[var(--color-fg)] bg-[var(--color-fg)] text-[var(--color-bg)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
        <button
          type="button"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          onClick={() => {
            void ordersQuery.refetch();
          }}
        >
          {fa.refreshNow}
        </button>
      </div>

      {banner ? (
        <p
          role="status"
          aria-live="polite"
          className={`rounded-[var(--radius-md)] border px-3 py-3 text-sm ${
            banner.kind === "error"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          {banner.text}
        </p>
      ) : null}

      {storesQuery.isError || ordersQuery.isError ? (
        <p role="alert" className="text-[var(--color-muted)]">
          {fa.networkError}
        </p>
      ) : null}

      {ordersQuery.isLoading || storesQuery.isLoading ? (
        <p aria-live="polite" className="text-[var(--color-muted)]">
          {fa.loading}
        </p>
      ) : null}

      {!ordersQuery.isLoading && selectedStoreId && filtered.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-[var(--color-muted)]">
          {statusFilter === "open" || statusFilter === "all"
            ? fa.empty
            : fa.emptyFilter}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3" aria-label={fa.boardTitle}>
        {filtered.map((order) => {
          const primary = primaryActionForStatus(order.status);
          const hold = readyHoldSignal(order);
          const holdHint = readyHoldHintFa(hold);
          const busy = actingId === order.id;

          return (
            <li
              key={order.id}
              className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex min-h-8 w-fit items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-1 text-sm font-medium">
                    {statusLabelFa(order.status)}
                  </span>
                  <p className="text-sm text-[var(--color-muted)]">
                    {fa.createdLabel}: {formatOrdersJalali(order.createdAt)}
                  </p>
                </div>
                <p className="text-base font-semibold text-[var(--color-fg)]">
                  {order.totalDisplayToman}
                </p>
              </div>

              <p className="text-[var(--color-fg)]">
                <span className="text-sm text-[var(--color-muted)]">
                  {fa.linesLabel}:{" "}
                </span>
                {summarizeLinesFa(order)}
              </p>

              {order.status === "pending_payment" ? (
                <p className="text-sm text-amber-800">{fa.unpaidHint}</p>
              ) : null}

              {holdHint ? (
                <p
                  className={`text-sm ${
                    hold === "expired" || hold === "urgent"
                      ? "font-medium text-amber-900"
                      : "text-[var(--color-muted)]"
                  }`}
                >
                  {holdHint}
                </p>
              ) : null}

              {order.cancelReason ? (
                <p className="text-sm text-[var(--color-muted)]">
                  {fa.cancelReasonLabel}: {order.cancelReason}
                </p>
              ) : null}

              <div className="flex flex-col gap-2">
                {primary ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void runAction(order, primary.action);
                    }}
                    className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-fg)] px-4 py-2.5 text-base text-[var(--color-bg)] disabled:opacity-60"
                  >
                    {busy ? fa.acting : primary.label}
                  </button>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {canCancelOrder(order.status) ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void runAction(order, "cancel", fa.cancelConfirm);
                      }}
                      className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-60"
                    >
                      {fa.actionCancel}
                    </button>
                  ) : null}
                  {canRefundOrder(order.status, order.paidAt) ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void runAction(order, "refund", fa.refundConfirm);
                      }}
                      className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-60"
                    >
                      {fa.actionRefund}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Keep column labels available for screen readers / future wide layout */}
      <span className="sr-only">
        {BOARD_OPEN_STATUSES.map((s) => statusLabelFa(s)).join(" · ")}
      </span>
    </div>
  );
}
