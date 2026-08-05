"use client";

import { useQuery } from "@tanstack/react-query";

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
    return (
      <p className="text-[var(--color-muted)]" aria-live="polite">
        {fa.loading}
      </p>
    );
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <p className="text-[var(--color-danger,#b91c1c)]" role="alert">
        {(meQuery.error as Error | null)?.message || fa.errorRetry}
      </p>
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
