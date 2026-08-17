/**
 * POS UI cart state shell (ADR-025 / docs/tech/zustand.md).
 * Concrete visual POS ships via uiuxpromax + ARD-007 / ADR-022.
 */

export {
  createPosCartStore,
  type PosCartLine,
  type PosCartState,
  type PosCartStore,
} from "../../../../shared/state/pos-cart-store.js";

export { STATE_MANAGEMENT_PATHS } from "../../../../shared/state/index.js";