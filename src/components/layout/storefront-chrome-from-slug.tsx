import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { loadStorefrontProfile } from "@/modules/storefront/ui/load";

import { StorefrontChrome } from "./storefront-chrome";

export type StorefrontChromeFromSlugProps = {
  storeSlug: string;
  mode?: "public" | "portal";
  children: ReactNode;
};

/** Loads store branding and wraps content in {@link StorefrontChrome}. */
export async function StorefrontChromeFromSlug({
  storeSlug,
  mode = "public",
  children,
}: StorefrontChromeFromSlugProps) {
  const profile = await loadStorefrontProfile(storeSlug);
  if (!profile) notFound();

  const { store } = profile;
  return (
    <StorefrontChrome
      storeSlug={storeSlug}
      storeName={store.branding.displayName}
      primaryColor={store.branding.primaryColor}
      mode={mode}
    >
      {children}
    </StorefrontChrome>
  );
}
