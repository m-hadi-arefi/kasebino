import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MARKETING_SEO_FA } from "@/modules/marketing/ui";

import "./marketing.css";

export const metadata: Metadata = {
  title: MARKETING_SEO_FA.title,
  description: MARKETING_SEO_FA.description,
  openGraph: {
    title: MARKETING_SEO_FA.ogTitle,
    description: MARKETING_SEO_FA.ogDescription,
    locale: "fa_IR",
    type: "website",
    siteName: "کاسبینو",
  },
  twitter: {
    card: "summary_large_image",
    title: MARKETING_SEO_FA.ogTitle,
    description: MARKETING_SEO_FA.ogDescription,
  },
  robots: { index: true, follow: true },
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
