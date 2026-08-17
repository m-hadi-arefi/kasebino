"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { FilterBar } from "@/components/composites/filter-bar";
import { LoadingState } from "@/components/composites/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchActiveStore } from "@/modules/merchant/ui";
import { useRealtimeStoreChannel } from "@/infrastructure/emqx/realtime-client/use-realtime-store-channel";

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
  showPageHeader?: boolean;
}) {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const storeId = props?.storeId;
  const showPageHeader = props?.showPageHeader ?? true;

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
      {showPageHeader ? (
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {props?.title ?? fa.merchantTitle}
          </h1>
          <p className="text-muted-foreground">
            {props?.subtitle ?? fa.merchantSubtitle}
          </p>
          <p className="text-sm text-muted-foreground">{fa.jalaliHint}</p>
          {unreadCount > 0 ? (
            <p
              className="text-sm font-medium text-foreground"
              aria-live="polite"
            >
              {fa.unreadCountLabel}: {unreadCount}
            </p>
          ) : null}
        </header>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{fa.jalaliHint}</p>
          {unreadCount > 0 ? (
            <p
              className="text-sm font-medium text-foreground"
              aria-live="polite"
            >
              {fa.unreadCountLabel}: {unreadCount}
            </p>
          ) : null}
        </>
      )}

      <div role="group" aria-label="فیلتر اعلان">
        <FilterBar>
          <Button
            type="button"
            variant={!unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly(false)}
          >
            {fa.filterAll}
          </Button>
          <Button
            type="button"
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly(true)}
          >
            {fa.filterUnread}
          </Button>
        </FilterBar>
      </div>

      {banner ? (
        <Alert>
          <AlertDescription aria-live="polite">{banner}</AlertDescription>
        </Alert>
      ) : null}

      {listQuery.isLoading ? (
        <LoadingState rows={3} label={fa.loading} />
      ) : null}

      {listQuery.isError ? (
        <ErrorState
          title={(listQuery.error as Error).message || fa.errorRetry}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
        <EmptyState title={fa.empty} />
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
    <li>
      <Card
        className={
          unread ? "border-s-4 border-s-primary" : undefined
        }
      >
        <CardContent className="flex flex-col gap-2 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium text-foreground">
              {n.titleFa}
            </h2>
            {unread ? (
              <Badge variant="secondary">{fa.unreadBadge}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{n.bodyFa}</p>
          <p className="text-xs text-muted-foreground">
            {formatNotificationJalali(n.createdAt)}
          </p>
          {unread ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={props.busy}
              className="w-fit"
              onClick={props.onMarkRead}
            >
              {props.busy ? fa.marking : fa.markRead}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{fa.markedRead}</p>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
