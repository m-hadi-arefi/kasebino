export type {
  CreateStockItemAggregateInput,
  StockItem,
} from "./stock-item.js";
export {
  applyStockDelta,
  createStockItemAggregate,
} from "./stock-item.js";
export {
  createStockMovement,
  STOCK_MOVEMENT_REASONS,
  type CreateStockMovementInput,
  type StockMovement,
  type StockMovementReason,
} from "./stock-movement.js";
export type { StockMovementRepository } from "./stock-movement-repository.js";
export {
  buildThresholdEvents,
  inventoryChangedEvent,
  inventoryDepletedEvent,
  inventoryLowDetectedEvent,
  inventoryLowEvent,
  inventoryOutOfStockEvent,
  stockAdjustedEvent,
  type InventoryChangeReason,
} from "./events.js";
export type {
  InventorySyncIdempotencyPort,
  StockItemRepository,
} from "./repositories.js";
