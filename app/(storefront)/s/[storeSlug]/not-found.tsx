import Link from "next/link";

import { STOREFRONT_UI_COPY_FA } from "@/modules/storefront/ui";

const fa = STOREFRONT_UI_COPY_FA;

export default function StorefrontNotFound() {
  return (
    <main
      lang="fa"
      dir="rtl"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-10"
    >
      <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
        {fa.notFoundTitle}
      </h1>
      <p className="text-[var(--color-muted)]">{fa.notFoundBody}</p>
      <Link
        href="/"
        className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
      >
        کاسبینو
      </Link>
    </main>
  );
}
