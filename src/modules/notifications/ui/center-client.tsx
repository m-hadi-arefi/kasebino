"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { fetchActiveStore } from "@/modules/merchant/ui";
import { useRealtimeStoreChannel } from "@/realtime-client/use-realtime-store-channel";

import { fetchNotifications, markNotificationRead } from "./api.js";
import { NOTIFICATIONS_UI_COPY_FA } from "./copy.js";
import { formatNotificationJalali } from "./format.js";
import type { NotificationDto } from "./api.js";

const fa = NOTIFICATIONS_UI_COPY_FA;

export function NotificationsCenterClient(props?: {
  storeId?: string;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}) {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const storeId = props?.storeId;

  const activeStoreQuery = useQuery({
    queryKey: ["notifications", "active-store"],
    queryFn: fetchActiveStore,
    staleTime: 30_000,
  });

  const resolvedStoreId =
    storeId ??
    activeStoreQuery.data?.activeStoreId ??
    activeStoreQuery.data?.store?.id ??
    null;
  const merchantId =
    activeStoreQuery.data?.stores?.find((s) => s.id === resolvedStoreId)
      ?.merchantId ??
    activeStoreQuery.data?.store?.merchantId ??
    activeStoreQuery.data?.stores?.[0]?.merchantId ??
    null;

  useRealtimeStoreChannel({
    merchantId,
    storeId: resolvedStoreId,
    channels: ["notifications", "orders"],
  });

  const listQuery = useQuery({
    queryKey: ["notifications", "list", unreadOnly, resolvedStoreId ?? ""],
    queryFn: () =>
      fetchNotifications({
        unreadOnly,
        ...(resolvedStoreId ? { storeId: resolvedStoreId } : {}),
      }),
    refetchInterval: 30_000,
  });

  const markMutation = useMutation({
    mutationFn: (id: string) =>
      markNotificationRead(
        id,
        resolvedStoreId ? { storeId: resolvedStoreId } : undefined,
      ),
    onSuccess: async () => {
      setBanner(fa.markedRead);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => {
      setBanner(err instanceof Error ? err.message : fa.errorRetry);
    },
  });

  const items = listQuery.data?.notifications ?? [];
  const unreadCount = listQuery.data?.unreadCount ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={props?.backHref ?? "/dashboard"}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {props?.backLabel ?? fa.backToDashboard}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {props?.title ?? fa.merchantTitle}
        </h1>
        <p className="text-[var(--color-muted)]">
          {props?.subtitle ?? fa.merchantSubtitle}
        </p>
        <p className="text-sm text-[var(--color-muted)]">{fa.jalaliHint}</p>
        {unreadCount > 0 ? (
          <p
            className="text-sm font-medium text-[var(--color-fg)]"
            aria-live="polite"
          >
            {fa.unreadCountLabel}: {unreadCount}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر اعلان">
        <button
          type="button"
          className={`min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 ${
            !unreadOnly
              ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
              : "bg-[var(--color-surface)] text-[var(--color-fg)]"
          }`}
          onClick={() => setUnreadOnly(false)}
        >
          {fa.filterAll}
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 ${
            unreadOnly
              ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
              : "bg-[var(--color-surface)] text-[var(--color-fg)]"
          }`}
          onClick={() => setUnreadOnly(true)}
        >
          {fa.filterUnread}
        </button>
      </div>

      {banner ? (
        <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
          {banner}
        </p>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-[var(--color-muted)]" aria-live="polite">
          {fa.loading}
        </p>
      ) : null}

      {listQuery.isError ? (
        <p className="text-[var(--color-danger,#b91c1c)]" role="alert">
          {(listQuery.error as Error).message || fa.errorRetry}
        </p>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
        <p className="text-[var(--color-muted)]">{fa.empty}</p>
      ) : null}

      <ul className="flex flex-col gap-3" aria-label={fa.merchantTitle}>
        {items.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            busy={markMutation.isPending && markMutation.variables === n.id}
            onMarkRead={() => markMutation.mutate(n.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function NotificationRow(props: {
  notification: NotificationDto;
  busy: boolean;
  onMarkRead: () => void;
}) {
  const n = props.notification;
  const unread = n.readAt === null;
  return (
    <li
      className={`rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 ${
        unread ? "border-s-4 border-s-[var(--color-primary)]" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium text-[var(--color-fg)]">
            {n.titleFa}
          </h2>
          {unread ? (
            <span className="text-xs text-[var(--color-muted)]">
              {fa.unreadBadge}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-[var(--color-muted)]">{n.bodyFa}</p>
        <p className="text-xs text-[var(--color-muted)]">
          {formatNotificationJalali(n.createdAt)}
        </p>
        {unread ? (
          <button
            type="button"
            disabled={props.busy}
            onClick={props.onMarkRead}
            className="min-h-11 self-start rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 text-[var(--color-fg)] disabled:opacity-60"
          >
            {props.busy ? fa.marking : fa.markRead}
          </button>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">{fa.markedRead}</p>
        )}
      </div>
    </li>
  );
}
