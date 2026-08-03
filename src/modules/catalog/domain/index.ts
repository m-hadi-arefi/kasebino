export type {
  Category,
  CreateCategoryAggregateInput,
} from "./category.js";
export { createCategoryAggregate } from "./category.js";
export type {
  CreateProductAggregateInput,
  Product,
} from "./product.js";
export {
  createProductAggregate,
  isProductActive,
  softDeleteProduct,
} from "./product.js";
export { productCreatedEvent, productDeletedEvent } from "./events.js";
export type {
  CategoryRepository,
  ProductRepository,
} from "./repositories.js";
