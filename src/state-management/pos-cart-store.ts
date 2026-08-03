/**
 * POS cart client state via Zustand (ADR-025).
 * Vanilla store — React hooks wrap this in staff POS UI (ADR-022 / ARD-007).
 * Never fetch or mirror server catalogs here.
 */

import { createStore, type StoreApi } from "zustand/vanilla";

export type PosCartLine = {
  productId: string;
  /** Persian product title snapshot — must round-trip UTF-8. */
  productName: string;
  quantity: number;
  /** Unit price in IRR minor units (rial). Display as تومان in UI. */
  unitPriceMinor: number;
};

export type PosCartState = {
  merchantId: string | null;
  storeId: string | null;
  /** Optional Iranian mobile draft for membership capture (`09…`). */
  customerPhoneDraft: string | null;
  lines: readonly PosCartLine[];
  setScope: (merchantId: string, storeId: string) => void;
  setCustomerPhoneDraft: (phone: string | null) => void;
  addLine: (line: PosCartLine) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  /** ADR-025 / security — call on merchant logout. */
  clearOnLogout: () => void;
};

export type PosCartStore = StoreApi<PosCartState>;

const emptySlice = {
  merchantId: null as string | null,
  storeId: null as string | null,
  customerPhoneDraft: null as string | null,
  lines: [] as readonly PosCartLine[],
};

export function createPosCartStore(
  initial?: Partial<
    Pick<
      PosCartState,
      "merchantId" | "storeId" | "customerPhoneDraft" | "lines"
    >
  >,
): PosCartStore {
  return createStore<PosCartState>((set, get) => ({
    ...emptySlice,
    ...initial,
    lines: initial?.lines ?? emptySlice.lines,
    setScope: (merchantId, storeId) => {
      set({ merchantId, storeId });
    },
    setCustomerPhoneDraft: (phone) => {
      set({ customerPhoneDraft: phone });
    },
    addLine: (line) => {
      if (line.quantity <= 0) {
        return;
      }
      const existing = get().lines.find((l) => l.productId === line.productId);
      if (existing) {
        set({
          lines: get().lines.map((l) =>
            l.productId === line.productId
              ? {
                  ...l,
                  quantity: l.quantity + line.quantity,
                  productName: line.productName,
                  unitPriceMinor: line.unitPriceMinor,
                }
              : l,
          ),
        });
        return;
      }
      set({ lines: [...get().lines, { ...line }] });
    },
    updateQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        set({
          lines: get().lines.filter((l) => l.productId !== productId),
        });
        return;
      }
      set({
        lines: get().lines.map((l) =>
          l.productId === productId ? { ...l, quantity } : l,
        ),
      });
    },
    removeLine: (productId) => {
      set({
        lines: get().lines.filter((l) => l.productId !== productId),
      });
    },
    clearCart: () => {
      set({ lines: [], customerPhoneDraft: null });
    },
    clearOnLogout: () => {
      set({ ...emptySlice, lines: [] });
    },
  }));
}
