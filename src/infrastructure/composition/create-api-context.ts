/**
 * ADR-094 / ADR-123 — injectable API composition root.
 * Production binds Drizzle repos + infra runtimes; tests inject InMemory* / stubs.
 */

import {
  createInMemoryRateLimiter,
  createRateLimiter,
  type RateLimiter,
} from "../../rate-limiting/index.js";
import { createRedisRuntime } from "../redis/index.js";
import type { ObjectStoragePort } from "../../minio-storage/index.js";
import { createStoreAssetUseCases } from "../../modules/store/application/upload-branding-asset.js";
import { createCatalogUseCases } from "../../modules/catalog/application/use-cases.js";
import { createInventoryUseCases } from "../../modules/inventory/application/use-cases.js";
import { createCrmUseCases } from "../../modules/crm/application/use-cases.js";
import {
  createLoyaltyEarnPort,
  createLoyaltyUseCases,
} from "../../modules/loyalty/application/use-cases.js";
import { createPosUseCases } from "../../modules/pos/application/use-cases.js";
import type { SaleOutboxPort } from "../../modules/pos/application/ports.js";
import { createOrderingUseCases } from "../../modules/ordering/application/use-cases.js";
import { createPaymentsUseCases } from "../../modules/payments/application/use-cases.js";
import { createNotificationsUseCases } from "../../modules/notifications/application/use-cases.js";
import { createMerchantUseCases } from "../../modules/merchant/application/use-cases.js";
import { createStoreUseCases } from "../../modules/store/application/use-cases.js";
import { createAdminUseCases } from "../../modules/admin/application/use-cases.js";
import {
  createNoopSecurityMonitoringPort,
  type SecurityMonitoringPort,
} from "../../modules/admin/application/ports.js";
import { createAdminAuditPortStub } from "../../modules/admin/infrastructure/audit/audit-port-stub.js";
import {
  createAnalyticsDashboardUseCases,
  createAnalyticsProjectionHandler,
  type AnalyticsDashboardUseCases,
  type AnalyticsProjectionHandler,
} from "../../modules/analytics/application/use-cases.js";
import type { AnalyticsProjectionRepository } from "../../modules/analytics/domain/projections.js";
import {
  DrizzleAnalyticsProjectionRepository,
  DrizzleMembershipCountersPort,
  DrizzleSalesCountersPort,
  InMemoryAnalyticsProjectionRepository,
  MembershipRepositoryCountersPort,
  SaleRepositoryCountersPort,
} from "../../modules/analytics/infrastructure/index.js";
import type {
  MembershipCountersPort,
  SalesCountersPort,
} from "../../merchant-oltp-analytics/index.js";
import { PersistInAppNotificationChannel } from "../../modules/notifications/infrastructure/channels/persist-in-app-channel.js";
import { SandboxPaymentGateway } from "../../modules/payments/infrastructure/gateway/sandbox-payment-gateway.js";
import { createSandboxPaymentConfirmPort } from "../../modules/payments/infrastructure/ordering/sandbox-payment-confirm-adapter.js";
import type { PaymentGateway } from "../../modules/payments/application/ports/payment-gateway.js";
import type { AuditPort, AuditStore } from "../../audit-logging/index.js";
import {
  createCacheAside,
  InMemoryCacheAsideStore,
  type CacheAsideClient,
} from "../../cache-aside/index.js";
import { envelopeFromDomainEvent } from "../../event-driven/index.js";
import type { OutboxStore } from "../../outbox/index.js";
import type { CacheAsideStorePort } from "../../cache-aside/port.js";
import type { ProductRepository, CategoryRepository } from "../../modules/catalog/domain/repositories.js";
import type { StockItemRepository } from "../../modules/inventory/domain/repositories.js";
import type { StoreMembershipRepository } from "../../modules/crm/domain/repositories.js";
import type { SaleRepository } from "../../modules/pos/domain/repositories.js";
import type {
  PointRuleRepository,
  PointsLedgerRepository,
  WalletRepository,
} from "../../modules/loyalty/domain/repositories.js";
import type { OrderRepository } from "../../modules/ordering/domain/repositories.js";
import type { PaymentRepository } from "../../modules/payments/domain/repositories.js";
import type { NotificationRepository } from "../../modules/notifications/domain/repositories.js";
import type { MerchantRepository } from "../../modules/merchant/domain/repositories.js";
import type { StoreRepository } from "../../modules/store/domain/repositories.js";
import type {
  AdminActionRepository,
  AdminUserRepository,
} from "../../modules/admin/domain/repositories.js";
import type { CustomerIdentityRepository } from "../../modules/customer-identity/domain/repositories.js";
import type { ProductionRepositories } from "../persistence/create-production-repositories.js";
import type { DrizzleDb } from "../database/drizzle/client.js";
import { createMongoRuntime } from "../mongodb/create-mongo-runtime.js";
import { createMinioRuntime } from "../minio/create-minio-runtime.js";
import {
  assertProductionCompositionEnv,
  assertProductionPaymentGatewayPolicy,
  assertProductionSmsPolicy,
} from "./production-guards.js";
import { getSharedProductionRepositories } from "./shared-production-repositories.js";

export type ApiRepositories = {
  merchants: MerchantRepository;
  stores: StoreRepository;
  products: ProductRepository;
  categories: CategoryRepository;
  stockItems: StockItemRepository;
  storeMemberships: StoreMembershipRepository;
  sales: SaleRepository;
  pointRules: PointRuleRepository;
  wallets: WalletRepository;
  pointsLedger: PointsLedgerRepository;
  orders: OrderRepository;
  payments: PaymentRepository;
  notifications: NotificationRepository;
  adminUsers: AdminUserRepository;
  adminActions: AdminActionRepository;
  /** Optional — required for customer storefront wallet (ADR-099). */
  customerIdentities?: CustomerIdentityRepository;
};

export type CreateApiContextOptions = {
  repos: ApiRepositories;
  paymentGateway?: PaymentGateway;
  audit?: AuditPort;
  auditStore?: AuditStore;
  securityMonitoring?: SecurityMonitoringPort;
  rateLimiter?: RateLimiter;
  /**
   * ADR-108 — `redis` (Compose REDIS_URL), `memory` (MOS_REDIS_MODE=memory mock),
   * or `injected` (tests).
   */
  rateLimitMode?: "memory" | "injected" | "redis";
  /** ADR-096 — CompleteSale outbox; production binds DrizzleOutboxStore. */
  outbox?: OutboxStore;
  /** Optional cache-aside store for in-process invalidation (ADR-054 / ADR-108). */
  cache?: CacheAsideStorePort;
  /** ADR-106 analytics — inject for tests; production derives from Drizzle db. */
  analytics?: {
    sales?: SalesCountersPort;
    memberships?: MembershipCountersPort;
    projections?: AnalyticsProjectionRepository;
    cacheClient?: CacheAsideClient;
  };
  /** When set, enables Drizzle analytics counters/projections (production). */
  drizzleDb?: DrizzleDb;
  /** ADR-111 — object storage (MinIO live or in-memory). */
  objectStorage?: ObjectStoragePort;
};

export type ApiContext = {
  repos: ApiRepositories;
  rateLimiter: RateLimiter;
  rateLimitMode: "memory" | "injected" | "redis";
  /** ADR-096/097 — transactional outbox for domain events. */
  outbox?: OutboxStore;
  /** Optional cache store for mutation-time key deletes (ADR-054). */
  cache?: CacheAsideStorePort;
  catalog: ReturnType<typeof createCatalogUseCases>;
  inventory: ReturnType<typeof createInventoryUseCases>;
  crm: ReturnType<typeof createCrmUseCases>;
  loyalty: ReturnType<typeof createLoyaltyUseCases>;
  pos: ReturnType<typeof createPosUseCases>;
  ordering: ReturnType<typeof createOrderingUseCases>;
  payments: ReturnType<typeof createPaymentsUseCases>;
  notifications: ReturnType<typeof createNotificationsUseCases>;
  merchants: ReturnType<typeof createMerchantUseCases>;
  stores: ReturnType<typeof createStoreUseCases>;
  admin: ReturnType<typeof createAdminUseCases>;
  /** ADR-106 merchant AN dashboards. */
  analytics: AnalyticsDashboardUseCases;
  analyticsProjection?: AnalyticsProjectionHandler;
  analyticsCache?: CacheAsideClient;
  auditStore?: AuditStore;
  /** ADR-111 MinIO / in-memory object storage. */
  objectStorage?: ObjectStoragePort;
  storeAssets?: ReturnType<typeof createStoreAssetUseCases>;
};

export function createApiContext(options: CreateApiContextOptions): ApiContext {
  const repos = options.repos;
  const rateLimitMode = options.rateLimitMode ?? "memory";
  const rateLimiter =
    options.rateLimiter ??
    createInMemoryRateLimiter(
      process.env.MOS_ENV?.trim() || process.env.NODE_ENV || "local",
    ).limiter;

  const catalog = createCatalogUseCases({
    products: repos.products,
    categories: repos.categories,
  });
  const inventory = createInventoryUseCases({
    stockItems: repos.stockItems,
  });
  const crm = createCrmUseCases({
    memberships: repos.storeMemberships,
    sales: repos.sales,
  });
  const loyalty = createLoyaltyUseCases({
    wallets: repos.wallets,
    rules: repos.pointRules,
    ledger: repos.pointsLedger,
  });

  const membershipPort = {
    async upsertFromPosPhoneCapture(input: {
      merchantId: string;
      storeId: string;
      phone: string;
      consentNoticeVersion?: string;
    }) {
      const result = await crm.upsertFromPosPhoneCapture({
        merchantId: input.merchantId,
        storeId: input.storeId,
        phone: input.phone,
        ...(input.consentNoticeVersion !== undefined
          ? { consentNoticeVersion: input.consentNoticeVersion }
          : {}),
      });
      return {
        membershipId: result.membership.id,
        customerId: result.membership.customerId,
        phoneNational: result.membership.phoneNational,
        created: result.created,
      };
    },
  };

  const inventoryPort = {
    async decrementForSale(input: {
      merchantId: string;
      storeId: string;
      productId: string;
      quantity: number;
      sameTransaction: true;
    }) {
      await inventory.decrementForSale(input);
    },
  };

  const outboxPort: SaleOutboxPort | undefined = options.outbox
    ? {
        async enqueueSaleEvents(input) {
          const store = options.outbox!;
          await store.enqueue({
            envelope: envelopeFromDomainEvent({
              domainEvent: input.createdEvent,
              merchantId: input.merchantId,
              storeId: input.storeId,
            }),
            aggregateId: input.createdEvent.aggregateId,
            aggregateType: input.createdEvent.aggregateType,
          });
          await store.enqueue({
            envelope: envelopeFromDomainEvent({
              domainEvent: input.completedEvent,
              merchantId: input.merchantId,
              storeId: input.storeId,
            }),
            aggregateId: input.completedEvent.aggregateId,
            aggregateType: input.completedEvent.aggregateType,
          });
        },
      }
    : undefined;

  const pos = createPosUseCases({
    sales: repos.sales,
    membership: membershipPort,
    inventory: inventoryPort,
    loyaltyEarn: createLoyaltyEarnPort(loyalty, {
      ...(options.outbox ? { outbox: options.outbox } : {}),
    }),
    ...(outboxPort ? { outbox: outboxPort } : {}),
    ...(options.objectStorage
      ? {
          objectStorage: options.objectStorage,
          resolveStoreDisplayName: async (input) => {
            const store = await repos.stores.findById(input.storeId);
            if (!store || store.merchantId !== input.merchantId) return null;
            return store.branding.displayName;
          },
        }
      : {}),
  });

  const paymentGateway =
    options.paymentGateway ??
    new SandboxPaymentGateway({
      ...(process.env.MOS_PAYMENTS_WEBHOOK_SECRET?.trim()
        ? { webhookSecret: process.env.MOS_PAYMENTS_WEBHOOK_SECRET.trim() }
        : {}),
    });

  /** ADR-102 — wire sandbox PaymentConfirmPort so markPaid reuses succeeded intents. */
  const ordering = createOrderingUseCases({
    orders: repos.orders,
    paymentConfirm: createSandboxPaymentConfirmPort({
      payments: repos.payments,
      gateway: paymentGateway,
    }),
  });

  const payments = createPaymentsUseCases({
    payments: repos.payments,
    gateway: paymentGateway,
  });

  const notifications = createNotificationsUseCases({
    notifications: repos.notifications,
    inAppChannel: new PersistInAppNotificationChannel(repos.notifications),
  });

  const merchants = createMerchantUseCases({
    merchants: repos.merchants,
  });
  const stores = createStoreUseCases({
    stores: repos.stores,
  });
  const storeAssets = options.objectStorage
    ? createStoreAssetUseCases({
        stores: repos.stores,
        objectStorage: options.objectStorage,
      })
    : undefined;

  const auditBundle = options.audit
    ? { port: options.audit, store: options.auditStore }
    : createAdminAuditPortStub();
  const audit = auditBundle.port;
  const resolvedAuditStore = options.auditStore ?? auditBundle.store;

  const securityMonitoring =
    options.securityMonitoring ?? createNoopSecurityMonitoringPort();

  const admin = createAdminUseCases({
    adminUsers: repos.adminUsers,
    adminActions: repos.adminActions,
    merchants: repos.merchants,
    audit,
    securityMonitoring,
  });

  const salesCounters: SalesCountersPort =
    options.analytics?.sales ??
    (options.drizzleDb
      ? new DrizzleSalesCountersPort(options.drizzleDb)
      : new SaleRepositoryCountersPort(repos.sales));
  const membershipCounters: MembershipCountersPort =
    options.analytics?.memberships ??
    (options.drizzleDb
      ? new DrizzleMembershipCountersPort(options.drizzleDb)
      : new MembershipRepositoryCountersPort(repos.storeMemberships));
  const projections: AnalyticsProjectionRepository =
    options.analytics?.projections ??
    (options.drizzleDb
      ? new DrizzleAnalyticsProjectionRepository(options.drizzleDb)
      : new InMemoryAnalyticsProjectionRepository());

  const analytics = createAnalyticsDashboardUseCases({
    sales: salesCounters,
    memberships: membershipCounters,
    projections,
  });
  const analyticsProjection = createAnalyticsProjectionHandler({ projections });
  const analyticsCache =
    options.analytics?.cacheClient ??
    createCacheAside(options.cache ?? new InMemoryCacheAsideStore());

  return {
    repos,
    rateLimiter,
    rateLimitMode,
    ...(options.outbox ? { outbox: options.outbox } : {}),
    ...(options.cache ? { cache: options.cache } : {}),
    catalog,
    inventory,
    crm,
    loyalty,
    pos,
    ordering,
    payments,
    notifications,
    merchants,
    stores,
    admin,
    analytics,
    analyticsProjection,
    analyticsCache,
    ...(resolvedAuditStore ? { auditStore: resolvedAuditStore } : {}),
    ...(options.objectStorage ? { objectStorage: options.objectStorage } : {}),
    ...(storeAssets ? { storeAssets } : {}),
  };
}

export function apiReposFromProduction(
  production: ProductionRepositories,
): ApiRepositories {
  return {
    merchants: production.merchants,
    stores: production.stores,
    products: production.products,
    categories: production.categories,
    stockItems: production.stockItems,
    storeMemberships: production.storeMemberships,
    sales: production.sales,
    pointRules: production.pointRules,
    wallets: production.wallets,
    pointsLedger: production.pointsLedger,
    orders: production.orders,
    payments: production.payments,
    notifications: production.notifications,
    adminUsers: production.adminUsers,
    adminActions: production.adminActions,
    customerIdentities: production.customerIdentities,
  };
}

/**
 * Canonical application composition root (ADR-123 FR-1).
 * Production: Drizzle + Redis/Mongo/MinIO runtimes (feature-flag degraded modes).
 * Fail-fast on missing critical production env; rejects console SMS default.
 */
export function createAppContext(
  env: NodeJS.ProcessEnv = process.env,
): ApiContext {
  assertProductionCompositionEnv(env);
  assertProductionSmsPolicy(env);
  assertProductionPaymentGatewayPolicy(env);

  const production = getSharedProductionRepositories(env);
  const redis = createRedisRuntime(env);
  // Prefer create* over get* so env overrides are testable without process singletons.
  const mongo = createMongoRuntime(env);
  const minio = createMinioRuntime(env);
  return createApiContext({
    repos: apiReposFromProduction(production),
    outbox: production.outbox,
    drizzleDb: production.db,
    cache: redis.cacheStore,
    rateLimiter: redis.rateLimiter,
    rateLimitMode: redis.mode,
    audit: mongo.auditPort,
    auditStore: mongo.auditStore,
    objectStorage: minio.storage,
    analytics: {
      cacheClient: redis.cacheAside,
    },
  });
}

/** @deprecated Prefer createAppContext — kept as alias for callers/docs. */
export function createProductionApiContext(
  env: NodeJS.ProcessEnv = process.env,
): ApiContext {
  return createAppContext(env);
}

const GLOBAL_API_CTX_KEY = "__merchantos_api_context__" as const;

type ApiContextSlot = { ctx: ApiContext | null };

function apiContextSlot(): ApiContextSlot {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_API_CTX_KEY]?: ApiContextSlot;
  };
  if (!g[GLOBAL_API_CTX_KEY]) {
    g[GLOBAL_API_CTX_KEY] = { ctx: null };
  }
  return g[GLOBAL_API_CTX_KEY];
}

/** Process singleton for App Router (injectable via setApiContextForTests). */
export function getApiContext(): ApiContext {
  const s = apiContextSlot();
  if (!s.ctx) {
    s.ctx = createAppContext();
  }
  return s.ctx;
}

export function setApiContextForTests(ctx: ApiContext | null): void {
  apiContextSlot().ctx = ctx;
}

/** Escape hatch when Redis port becomes available (ADR-108). */
export function createApiContextWithRateLimiter(
  repos: ApiRepositories,
  rateLimiter: RateLimiter,
): ApiContext {
  return createApiContext({
    repos,
    rateLimiter,
    rateLimitMode: "injected",
  });
}

export { createRateLimiter };
