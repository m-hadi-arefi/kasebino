"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { fetchPortalMe } from "@/customer-dashboard/ui";
import { NotificationsCenterClient } from "@/modules/notifications/ui/center-client";
import { NOTIFICATIONS_UI_COPY_FA } from "@/modules/notifications/ui";

const fa = NOTIFICATIONS_UI_COPY_FA;

export function CustomerNotificationsClient({
  storeSlug,
}: {
  storeSlug: string;
}) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const meQuery = useQuery({
    queryKey: ["customer", "me", storeSlug, "notifications"],
    queryFn: () => fetchPortalMe(storeSlug),
  });

  if (meQuery.isLoading) {
    return <LoadingState rows={2} label={fa.loading} />;
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <ErrorState
        description={(meQuery.error as Error | null)?.message || fa.errorRetry}
        onRetry={() => void meQuery.refetch()}
      />
    );
  }

  return (
    <NotificationsCenterClient
      storeId={meQuery.data.storeId}
      backHref={`${base}/dashboard`}
      backLabel={fa.backToPortal}
      title={fa.customerTitle}
      subtitle={fa.customerSubtitle}
    />
  );
}
