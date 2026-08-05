import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  const accent = store.branding.primaryColor;
  const accentStyle = accent
    ? ({ ["--color-primary"]: accent } as CSSProperties)
    : undefined;
  const map = store.map;
  const primaryNav = map?.navigateItems?.[0] ?? null;

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6"
      style={accentStyle}
    >
      <header className="flex flex-col gap-2">
        <Link
          href={base}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {fa.backHome}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.aboutTitle}
        </h1>
        <p className="text-lg font-medium">{store.branding.displayName}</p>
      </header>

      <section className="flex flex-col gap-2 text-[var(--color-fg)]">
        <h2 className="text-base font-semibold">{fa.aboutAddress}</h2>
        <p>{store.address.displayAddress || store.address.city}</p>
        <p className="text-sm text-[var(--color-muted)]">
          {store.address.city}
          {store.address.province ? ` · ${store.address.province}` : ""}
        </p>
      </section>

      <section
        className="flex flex-col gap-3 text-[var(--color-fg)]"
        aria-label={fa.aboutMap}
      >
        <h2 className="text-base font-semibold">{fa.aboutMap}</h2>
        {map?.available && map.staticImagePath ? (
          <img
            src={map.staticImagePath}
            alt={`نقشهٔ تقریبی موقعیت «${store.branding.displayName}»`}
            width={640}
            height={360}
            className="h-auto w-full object-cover"
          />
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            {fa.aboutMapFallback}
          </p>
        )}
        {primaryNav ? (
          <a
            href={primaryNav.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-center font-medium text-[var(--color-primary-fg)]"
          >
            {primaryNav.labelFa}
          </a>
        ) : null}
        {map?.navigateItems && map.navigateItems.length > 1 ? (
          <ul className="flex flex-col gap-2">
            {map.navigateItems.slice(1).map((item) => (
              <li key={item.provider}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm"
                >
                  {item.labelFa}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="flex flex-col gap-2 text-[var(--color-fg)]">
        <h2 className="text-base font-semibold">{fa.aboutHours}</h2>
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
      </section>

      <p className="text-sm text-[var(--color-muted)]">{fa.pickupRestrictionNote}</p>
    </main>
  );
}
