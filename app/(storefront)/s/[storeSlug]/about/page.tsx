import type { Metadata } from "next";
import Link from "next/link";

/** Public storefront cache — ADR-086 (600s). */
export const revalidate = 600;

type AboutPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `دربارهٔ مغازه «${storeSlug}» | کاسبینو`,
    description: "اطلاعات مغازه — سفارش فقط به‌صورت حضوری (پیکاپ)",
  };
}

export default async function StorefrontAboutPage({ params }: AboutPageProps) {
  const { storeSlug } = await params;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href={`/s/${encodeURIComponent(storeSlug)}`}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          خانه
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          دربارهٔ مغازه
        </h1>
      </header>

      <section className="flex flex-col gap-3 text-[var(--color-fg)]">
        <p>
          فروشگاه «{storeSlug}» — محل دریافت سفارش حضوری (پیکاپ). نقشه و مسیر در
          به‌روزرسانی‌های بعدی اضافه می‌شود.
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          ارسال پیک یا پیک موتوری در دسترس نیست.
        </p>
      </section>
    </main>
  );
}
