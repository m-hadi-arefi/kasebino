/**
 * Stock movement repository port + adapters (ADR-126).
 */

import type { StockMovement } from "../domain/stock-movement.js";

export type StockMovementRepository = {
  append(movement: StockMovement): Promise<void>;
  listByReference(input: {
    merchantId: string;
    referenceType: string;
    referenceId: string;
  }): Promise<StockMovement[]>;
};
