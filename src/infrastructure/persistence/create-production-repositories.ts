/**
 * Production repository composition root (ADR-093 / ADR-126 TX scope).
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
import { DrizzleStockMovementRepository } from "../../modules/inventory/infrastructure/persistence/drizzle-stock-movement-repository.js";
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
import { DrizzleExternalEntityMappingRepository } from "../../modules/accounting/infrastructure/persistence/external-entity-mapping-repository.js";
import { DrizzleErpNextSyncRecordRepository } from "../../modules/erpnext/infrastructure/persistence/sync-record-repository.js";
import {
  DrizzleOutboxStore,
  DrizzleProcessedSet,
} from "./drizzle-outbox.js";
import { DrizzleTransactionScope } from "./drizzle-transaction-scope.js";

export type ProductionRepositories = {
  db: DrizzleDb;
  /** Shared TX scope for CompleteSale UoW (ADR-126). */
  txScope: DrizzleTransactionScope;
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
  stockMovements: DrizzleStockMovementRepository;
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
  externalEntityMappings: DrizzleExternalEntityMappingRepository;
  erpnextSyncRecords: DrizzleErpNextSyncRecordRepository;
};

export function createProductionRepositoriesFromDb(
  db: DrizzleDb,
): ProductionRepositories {
  const txScope = new DrizzleTransactionScope(db);
  return {
    db,
    txScope,
    merchants: new DrizzleMerchantRepository(db),
    stores: new DrizzleStoreRepository(db),
    authUsers: new DrizzleAuthUserRepository(db),
    otpChallenges: new DrizzleOtpChallengeRepository(db),
    customerIdentities: new DrizzleCustomerIdentityRepository(db),
    customerOtpChallenges: new DrizzleCustomerOtpChallengeRepository(db),
    storeMemberships: new DrizzleStoreMembershipRepository(txScope),
    products: new DrizzleProductRepository(db),
    categories: new DrizzleCategoryRepository(db),
    stockItems: new DrizzleStockItemRepository(txScope),
    stockMovements: new DrizzleStockMovementRepository(txScope),
    sales: new DrizzleSaleRepository(txScope),
    pointRules: new DrizzlePointRuleRepository(txScope),
    wallets: new DrizzleWalletRepository(txScope),
    pointsLedger: new DrizzlePointsLedgerRepository(txScope),
    orders: new DrizzleOrderRepository(db),
    payments: new DrizzlePaymentRepository(db),
    notifications: new DrizzleNotificationRepository(db),
    adminUsers: new DrizzleAdminUserRepository(db),
    adminActions: new DrizzleAdminActionRepository(db),
    outbox: new DrizzleOutboxStore(txScope),
    processedEvents: new DrizzleProcessedSet(db),
    externalEntityMappings: new DrizzleExternalEntityMappingRepository(db),
    erpnextSyncRecords: new DrizzleErpNextSyncRecordRepository(db),
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
