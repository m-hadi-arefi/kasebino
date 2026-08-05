import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MARKETING_COPY_FA,
  MARKETING_CTA,
} from "@/modules/marketing/ui";

const copy = MARKETING_COPY_FA;

function SectionShell({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("px-4 py-16 sm:px-6 sm:py-20", className)}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  headline,
  support,
}: {
  eyebrow: string;
  headline: string;
  support?: string;
}) {
  return (
    <header className="mb-10 max-w-2xl">
      <p className="mb-2 text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="text-balance text-2xl font-bold tracking-tight text-fg sm:text-3xl">
        {headline}
      </h2>
      {support ? (
        <p className="mt-3 text-pretty text-base text-muted sm:text-lg">{support}</p>
      ) : null}
    </header>
  );
}

export default function MarketingHomePage() {
  return (
    <div dir="rtl" lang="fa" className="bg-bg text-fg">
      <a
        href="#features"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
      >
        {copy.skipToContent}
      </a>

      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-lg font-bold tracking-tight text-primary">{copy.brand}</p>
          <nav
            aria-label="ناوبری اصلی"
            className="flex items-center gap-1 sm:gap-2"
          >
            <Link
              href="#features"
              className="hidden min-h-11 items-center px-2 text-sm text-muted sm:inline-flex"
            >
              {copy.navFeatures}
            </Link>
            <Link
              href="#pricing"
              className="hidden min-h-11 items-center px-2 text-sm text-muted sm:inline-flex"
            >
              {copy.navPricing}
            </Link>
            <Button asChild variant="ghost">
              <Link href={MARKETING_CTA.secondaryHref}>{copy.navLogin}</Link>
            </Button>
            <Button asChild className="mos-mkt-cta-primary">
              <Link href={MARKETING_CTA.primaryHref}>{copy.navStart}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero — full-bleed brand composition */}
        <section
          id="hero"
          className="relative isolate min-h-[min(100dvh,52rem)] overflow-hidden"
        >
          <div className="absolute inset-0 -z-10">
            <Image
              src="/marketing/hero-shop.svg"
              alt="پیشخوان مغازه با صندوق موبایلی کاسبینو"
              fill
              priority
              unoptimized
              className="mos-mkt-hero-media object-cover object-center"
              sizes="100vw"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#0a1a1c]/95 via-[#0a1a1c]/55 to-[#0a1a1c]/25"
            />
          </div>

          <div className="mos-mkt-hero-copy mx-auto flex min-h-[min(100dvh,52rem)] w-full max-w-5xl flex-col justify-end px-4 pb-16 pt-16 sm:px-6 sm:pb-20">
            <p className="mb-4 text-4xl font-black tracking-tight text-primary-fg sm:text-6xl md:text-7xl">
              {copy.brand}
            </p>
            <h1 className="max-w-xl text-balance text-2xl font-bold text-primary-fg sm:text-3xl md:text-4xl">
              {copy.heroHeadline}
            </h1>
            <p className="mt-4 max-w-lg text-pretty text-base text-primary-fg/90 sm:text-lg">
              {copy.heroSupport}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="mos-mkt-cta-primary w-full sm:w-auto">
                <Link href={MARKETING_CTA.primaryHref}>{copy.heroCtaPrimary}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-primary-fg/40 bg-transparent text-primary-fg hover:bg-white/10 hover:text-primary-fg sm:w-auto"
              >
                <Link href={MARKETING_CTA.secondaryHref}>
                  {copy.heroCtaSecondary}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <SectionShell id="features" className="bg-surface">
          <SectionIntro
            eyebrow={copy.featuresEyebrow}
            headline={copy.featuresHeadline}
            support={copy.featuresSupport}
          />
          <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {copy.features.map((feature) => (
              <li key={feature.id} className="border-s-2 border-primary ps-4">
                <h3 className="text-lg font-semibold text-fg">{feature.title}</h3>
                <p className="mt-2 text-muted">{feature.body}</p>
              </li>
            ))}
          </ul>
        </SectionShell>

        <SectionShell id="benefits">
          <SectionIntro
            eyebrow={copy.benefitsEyebrow}
            headline={copy.benefitsHeadline}
            support={copy.benefitsSupport}
          />
          <ol className="space-y-8">
            {copy.benefits.map((item, index) => (
              <li
                key={item.title}
                className="grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-6"
              >
                <span className="text-sm font-semibold tabular-nums text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </SectionShell>

        <SectionShell id="how-it-works" className="bg-surface">
          <SectionIntro
            eyebrow={copy.howEyebrow}
            headline={copy.howHeadline}
            support={copy.howSupport}
          />
          <ol className="grid gap-8 sm:grid-cols-2">
            {copy.howSteps.map((step) => (
              <li key={step.step}>
                <p className="text-3xl font-black text-primary/25">{step.step}</p>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </SectionShell>

        <SectionShell id="screenshots">
          <SectionIntro
            eyebrow={copy.shotsEyebrow}
            headline={copy.shotsHeadline}
            support={copy.shotsSupport}
          />
          <ul className="grid gap-8 sm:grid-cols-3">
            {copy.shots.map((shot) => (
              <li key={shot.id} className="mos-mkt-shot">
                <figure>
                  <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[1.75rem] bg-[#142033] shadow-sm ring-1 ring-border">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="220px"
                    />
                  </div>
                  <figcaption className="mt-4 text-center font-medium">
                    {shot.title}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </SectionShell>

        <SectionShell id="pricing" className="bg-surface">
          <SectionIntro
            eyebrow={copy.pricingEyebrow}
            headline={copy.pricingHeadline}
            support={copy.pricingNote}
          />
          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-fg">
            {copy.pricingBody}
          </p>
        </SectionShell>

        <SectionShell id="faq">
          <SectionIntro
            eyebrow={copy.faqEyebrow}
            headline={copy.faqHeadline}
          />
          <div className="divide-y divide-border border-y border-border">
            {copy.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-start text-base font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="text-muted transition-transform group-open:-rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          id="cta"
          className="bg-[linear-gradient(160deg,#0f6b63_0%,#0a4540_55%,#142033_100%)] text-primary-fg"
        >
          <div className="max-w-2xl">
            <h2 className="text-balance text-2xl font-bold sm:text-3xl">
              {copy.finalCtaHeadline}
            </h2>
            <p className="mt-3 text-pretty text-base text-primary-fg/90 sm:text-lg">
              {copy.finalCtaSupport}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="mos-mkt-cta-primary w-full bg-primary-fg text-primary hover:bg-primary-fg/90 sm:w-auto"
              >
                <Link href={MARKETING_CTA.primaryHref}>{copy.finalCtaPrimary}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-primary-fg/40 bg-transparent text-primary-fg hover:bg-white/10 hover:text-primary-fg sm:w-auto"
              >
                <Link href={MARKETING_CTA.secondaryHref}>
                  {copy.finalCtaSecondary}
                </Link>
              </Button>
            </div>
          </div>
        </SectionShell>
      </main>

      <footer id="footer" className="border-t border-border bg-surface px-4 py-12 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="text-xl font-bold">{copy.footerCompany}</p>
            <p className="mt-2 text-muted">{copy.footerTagline}</p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">{copy.footerProduct}</p>
            <ul className="space-y-2 text-muted">
              <li>
                <Link className="inline-flex min-h-11 items-center" href="#features">
                  {copy.footerFeatures}
                </Link>
              </li>
              <li>
                <Link className="inline-flex min-h-11 items-center" href="#pricing">
                  {copy.footerPricing}
                </Link>
              </li>
              <li>
                <Link className="inline-flex min-h-11 items-center" href="#faq">
                  {copy.footerFaq}
                </Link>
              </li>
              <li>
                <Link
                  className="inline-flex min-h-11 items-center"
                  href={MARKETING_CTA.secondaryHref}
                >
                  {copy.footerLogin}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-5xl text-sm text-muted">
          © {new Date().getFullYear()} {copy.footerCompany}. {copy.footerRights}
        </p>
      </footer>
    </div>
  );
}
