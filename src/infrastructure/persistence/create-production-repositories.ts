/**
 * Production repository composition root (ADR-093).
 *
 * Wires Drizzle adapters only. Callers for unit tests keep using InMemory*.
 * Domain modules never import drizzle-orm.
 */

import {
  createDb,
  createDbFromEnv,
  type DrizzleDb,
} from "../database/drizzle/client.js";
import { DrizzleAdminActionRepository, DrizzleAdminUserRepository } from "../../modules/admin/infrastructure/persistence/drizzle-admin-repositories.js";
import {
  DrizzleCategoryRepository,
  DrizzleProductRepository,
} from "../../modules/catalog/infrastructure/persistence/drizzle-catalog-repository.js";
import {
  DrizzleCustomerIdentityRepository,
  DrizzleCustomerOtpChallengeRepository,
} from "../../modules/customer-identity/infrastructure/persistence/drizzle-repositories.js";
import { DrizzleStoreMembershipRepository } from "../../modules/crm/infrastructure/persistence/drizzle-store-membership-repository.js";
import {
  DrizzleAuthUserRepository,
  DrizzleOtpChallengeRepository,
} from "../../modules/identity/infrastructure/persistence/drizzle-repositories.js";
import { DrizzleStockItemRepository } from "../../modules/inventory/infrastructure/persistence/drizzle-stock-item-repository.js";
import {
  DrizzlePointRuleRepository,
  DrizzlePointsLedgerRepository,
  DrizzleWalletRepository,
} from "../../modules/loyalty/infrastructure/persistence/drizzle-loyalty-repositories.js";
import { DrizzleMerchantRepository } from "../../modules/merchant/infrastructure/persistence/drizzle-merchant-repository.js";
import { DrizzleNotificationRepository } from "../../modules/notifications/infrastructure/persistence/drizzle-notification-repository.js";
import { DrizzleOrderRepository } from "../../modules/ordering/infrastructure/persistence/drizzle-order-repository.js";
import { DrizzlePaymentRepository } from "../../modules/payments/infrastructure/persistence/drizzle-payment-repository.js";
import { DrizzleSaleRepository } from "../../modules/pos/infrastructure/persistence/drizzle-sale-repository.js";
import { DrizzleStoreRepository } from "../../modules/store/infrastructure/persistence/drizzle-store-repository.js";
import {
  DrizzleOutboxStore,
  DrizzleProcessedSet,
} from "./drizzle-outbox.js";

export type ProductionRepositories = {
  db: DrizzleDb;
  merchants: DrizzleMerchantRepository;
  stores: DrizzleStoreRepository;
  authUsers: DrizzleAuthUserRepository;
  otpChallenges: DrizzleOtpChallengeRepository;
  customerIdentities: DrizzleCustomerIdentityRepository;
  customerOtpChallenges: DrizzleCustomerOtpChallengeRepository;
  storeMemberships: DrizzleStoreMembershipRepository;
  products: DrizzleProductRepository;
  categories: DrizzleCategoryRepository;
  stockItems: DrizzleStockItemRepository;
  sales: DrizzleSaleRepository;
  pointRules: DrizzlePointRuleRepository;
  wallets: DrizzleWalletRepository;
  pointsLedger: DrizzlePointsLedgerRepository;
  orders: DrizzleOrderRepository;
  payments: DrizzlePaymentRepository;
  notifications: DrizzleNotificationRepository;
  adminUsers: DrizzleAdminUserRepository;
  adminActions: DrizzleAdminActionRepository;
  outbox: DrizzleOutboxStore;
  processedEvents: DrizzleProcessedSet;
};

export function createProductionRepositoriesFromDb(
  db: DrizzleDb,
): ProductionRepositories {
  return {
    db,
    merchants: new DrizzleMerchantRepository(db),
    stores: new DrizzleStoreRepository(db),
    authUsers: new DrizzleAuthUserRepository(db),
    otpChallenges: new DrizzleOtpChallengeRepository(db),
    customerIdentities: new DrizzleCustomerIdentityRepository(db),
    customerOtpChallenges: new DrizzleCustomerOtpChallengeRepository(db),
    storeMemberships: new DrizzleStoreMembershipRepository(db),
    products: new DrizzleProductRepository(db),
    categories: new DrizzleCategoryRepository(db),
    stockItems: new DrizzleStockItemRepository(db),
    sales: new DrizzleSaleRepository(db),
    pointRules: new DrizzlePointRuleRepository(db),
    wallets: new DrizzleWalletRepository(db),
    pointsLedger: new DrizzlePointsLedgerRepository(db),
    orders: new DrizzleOrderRepository(db),
    payments: new DrizzlePaymentRepository(db),
    notifications: new DrizzleNotificationRepository(db),
    adminUsers: new DrizzleAdminUserRepository(db),
    adminActions: new DrizzleAdminActionRepository(db),
    outbox: new DrizzleOutboxStore(db),
    processedEvents: new DrizzleProcessedSet(db),
  };
}

/** Production path — DATABASE_URL required. Never selects InMemory*. */
export function createProductionRepositories(
  env: NodeJS.ProcessEnv = process.env,
): ProductionRepositories {
  return createProductionRepositoriesFromDb(createDbFromEnv(env));
}

export function createProductionRepositoriesFromUrl(
  connectionString: string,
): ProductionRepositories {
  return createProductionRepositoriesFromDb(createDb(connectionString));
}
