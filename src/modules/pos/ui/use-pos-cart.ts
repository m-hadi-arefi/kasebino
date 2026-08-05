/**
 * ADR-096 POS client cart singleton (Zustand + React).
 * Imported only from client components under app/(merchant)/pos.
 */

import { useStore } from "zustand";

import {
  createPosCartStore,
  type PosCartState,
  type PosCartStore,
} from "../../../state-management/pos-cart-store.js";

let cartStore: PosCartStore | null = null;

export function getPosCartStore(): PosCartStore {
  if (!cartStore) {
    cartStore = createPosCartStore();
  }
  return cartStore;
}

/** Test helper — reset singleton between tests. */
export function resetPosCartStoreForTests(): void {
  cartStore = createPosCartStore();
}

export function usePosCart<T>(selector: (state: PosCartState) => T): T {
  return useStore(getPosCartStore(), selector);
}
