import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { StorefrontChrome } from "@/components/layout/storefront-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STOREFRONT_UI_COPY_FA,
  WEEKDAY_LABELS_FA,
  formatDayHoursFa,
} from "@/modules/storefront/ui";
import { loadStorefrontProfile } from "@/modules/storefront/ui/load";
import { WEEKDAY_KEYS } from "@/modules/store/domain/hours";

/** Public storefront cache — ADR-086 (600s). */
export const revalidate = 600;

const fa = STOREFRONT_UI_COPY_FA;

type AboutPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  const profile = await loadStorefrontProfile(storeSlug);
  const name = profile?.store.branding.displayName ?? storeSlug;
  return {
    title: `دربارهٔ «${name}» | کاسبینو`,
    description: "اطلاعات مغازه — سفارش فقط به‌صورت حضوری (پیکاپ)",
  };
}

export default async function StorefrontAboutPage({ params }: AboutPageProps) {
  const { storeSlug } = await params;
  const profile = await loadStorefrontProfile(storeSlug);
  if (!profile) notFound();

  const { store } = profile;
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const map = store.map;
  const primaryNav = map?.navigateItems?.[0] ?? null;

  return (
    <StorefrontChrome
      storeSlug={storeSlug}
      storeName={store.branding.displayName}
      primaryColor={store.branding.primaryColor}
      mode="public"
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          title={fa.aboutTitle}
          description={store.branding.displayName}
          breadcrumbs={[
            { label: fa.backHome, href: base },
            { label: fa.aboutTitle },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{fa.aboutAddress}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-foreground">
            <p>{store.address.displayAddress || store.address.city}</p>
            <p className="text-sm text-muted-foreground">
              {store.address.city}
              {store.address.province ? ` · ${store.address.province}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card aria-label={fa.aboutMap}>
          <CardHeader>
            <CardTitle className="text-base">{fa.aboutMap}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {map?.available && map.staticImagePath ? (
              <img
                src={map.staticImagePath}
                alt={`نقشهٔ تقریبی موقعیت «${store.branding.displayName}»`}
                width={640}
                height={360}
                className="h-auto w-full rounded-md object-cover"
              />
            ) : (
              <p className="text-sm text-muted-foreground">{fa.aboutMapFallback}</p>
            )}
            {primaryNav ? (
              <Button asChild className="min-h-11 w-full">
                <a
                  href={primaryNav.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {primaryNav.labelFa}
                </a>
              </Button>
            ) : null}
            {map?.navigateItems && map.navigateItems.length > 1 ? (
              <ul className="flex flex-col gap-2">
                {map.navigateItems.slice(1).map((item) => (
                  <li key={item.provider}>
                    <Button asChild variant="outline" className="min-h-11 w-full">
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.labelFa}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{fa.aboutHours}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {WEEKDAY_KEYS.map((key) => {
                const hours = store.hours[key];
                return (
                  <li key={key}>
                    {WEEKDAY_LABELS_FA[key] ?? key}:{" "}
                    {hours
                      ? formatDayHoursFa(hours.open, hours.close)
                      : fa.aboutClosed}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">{fa.pickupRestrictionNote}</p>
      </div>
    </StorefrontChrome>
  );
}
