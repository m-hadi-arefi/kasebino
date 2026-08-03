/**
 * ADR-019 / ADR-020 — className merge helper for shadcn primitives.
 * Uses clsx + tailwind-merge once Tailwind design tokens are installed.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type { ClassValue };

/** Merge class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
