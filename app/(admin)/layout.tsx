import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "مدیریت پلتفرم | کاسبینو",
  description: "پنل مدیریت پلتفرم کاسبینو",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
