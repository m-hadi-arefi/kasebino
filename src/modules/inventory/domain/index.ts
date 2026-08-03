export type {
  CreateStockItemAggregateInput,
  StockItem,
} from "./stock-item.js";
export {
  applyStockDelta,
  createStockItemAggregate,
} from "./stock-item.js";
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
