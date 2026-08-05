/**
 * ADR-100 client cart — sessionStorage scoped per store slug.
 */

export type StorefrontCartLine = {
  productId: string;
  name: string;
  unitPriceMinor: string;
  priceDisplayToman: string;
  quantity: number;
};

function storageKey(storeSlug: string): string {
  return `mos:sf:cart:${storeSlug}`;
}

export function readStorefrontCart(storeSlug: string): StorefrontCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(storageKey(storeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StorefrontCartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStorefrontCart(
  storeSlug: string,
  lines: StorefrontCartLine[],
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(storeSlug), JSON.stringify(lines));
}

export function clearStorefrontCart(storeSlug: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(storageKey(storeSlug));
}

export function addToStorefrontCart(
  storeSlug: string,
  line: Omit<StorefrontCartLine, "quantity"> & { quantity?: number },
): StorefrontCartLine[] {
  const qty = line.quantity ?? 1;
  const current = readStorefrontCart(storeSlug);
  const idx = current.findIndex((l) => l.productId === line.productId);
  if (idx >= 0) {
    const existing = current[idx]!;
    current[idx] = { ...existing, quantity: existing.quantity + qty };
  } else {
    current.push({
      productId: line.productId,
      name: line.name,
      unitPriceMinor: line.unitPriceMinor,
      priceDisplayToman: line.priceDisplayToman,
      quantity: qty,
    });
  }
  writeStorefrontCart(storeSlug, current);
  return current;
}

export function setCartLineQuantity(
  storeSlug: string,
  productId: string,
  quantity: number,
): StorefrontCartLine[] {
  const next =
    quantity <= 0
      ? readStorefrontCart(storeSlug).filter((l) => l.productId !== productId)
      : readStorefrontCart(storeSlug).map((l) =>
          l.productId === productId ? { ...l, quantity } : l,
        );
  writeStorefrontCart(storeSlug, next);
  return next;
}

export function cartTotalMinor(lines: StorefrontCartLine[]): bigint {
  return lines.reduce(
    (sum, line) => sum + BigInt(line.unitPriceMinor) * BigInt(line.quantity),
    0n,
  );
}
