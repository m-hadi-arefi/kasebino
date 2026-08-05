export type {
  Category,
  CreateCategoryAggregateInput,
} from "./category.js";
export {
  createCategoryAggregate,
  renameCategory,
  softDeleteCategory,
} from "./category.js";
export type {
  ApplyProductUpdateInput,
  CreateProductAggregateInput,
  Product,
} from "./product.js";
export {
  applyProductUpdate,
  createProductAggregate,
  isProductActive,
  softDeleteProduct,
} from "./product.js";
export {
  productCreatedEvent,
  productDeletedEvent,
  productUpdatedEvent,
} from "./events.js";
export type {
  CategoryRepository,
  ProductRepository,
} from "./repositories.js";
