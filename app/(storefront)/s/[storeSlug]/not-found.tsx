import Link from "next/link";

import { EmptyState } from "@/components/composites/empty-state";
import { Button } from "@/components/ui/button";
import { STOREFRONT_UI_COPY_FA } from "@/modules/storefront/ui";

const fa = STOREFRONT_UI_COPY_FA;

export default function StorefrontNotFound() {
  return (
    <main lang="fa" dir="rtl" className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-10">
      <EmptyState
        title={fa.notFoundTitle}
        description={fa.notFoundBody}
        actionLabel="کاسبینو"
        actionHref="/"
      />
      <Button asChild variant="link" className="self-center">
        <Link href="/">بازگشت به کاسبینو</Link>
      </Button>
    </main>
  );
}
