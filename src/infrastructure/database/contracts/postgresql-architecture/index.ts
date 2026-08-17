/**

 * ADR-041 — PostgreSQL Architecture contract.

 * PostgreSQL is the sole OLTP system of record. Mongo never replaces it.

 * Schema/ORM details deferred: Drizzle (ADR-042), modeling (ADR-043),
 * soft-delete / audit integrity (`src/infrastructure/database/contracts/data-integrity`, ADR-047).

 */



import { DATA_PLANES, PRODUCT_ARCHITECTURE } from "../../../../shared/architecture/product/index.js";

import {

  COMPOSE_DATA_PLANES,

  COMPOSE_FILES,

  POSTGRES_UTF8_REQUIREMENTS,

} from "../../../../shared/contracts/docker-compose-parity/index.js";



/** Engine identity — latest stable PostgreSQL (compose pins a supported major). */

export const POSTGRESQL_ENGINE = {

  name: "postgresql",

  role: "oltp_source_of_truth",

  plane: "postgresql_oltp",

  channel: "latest_stable",

  /** Local parity image major from ADR-066 compose (acceptable stable channel). */

  composeImageMajor: 16,

  soleOltpSourceOfTruth: true,

} as const;



/**

 * Forbidden OLTP engines / anti-patterns.

 * Mongo remains analytics/audit/telemetry only (ADR-056 / ADR-066).

 */

export const FORBIDDEN_OLTP = {

  mongodbAsOltpSot: false,

  documentDbAsMoneyStockSot: false,

  mysqlAsPrimary: false,

  cockroachAsPrimary: false,

} as const;



/** Universal column expectations (high level; detail ADR-043 / ADR-047). */

export const UNIVERSAL_COLUMN_EXPECTATIONS = {

  primaryKey: {

    sql: "id",

    type: "uuid",

    generatedIn: "db_or_app",

  },

  timestamps: {

    createdAt: { sql: "created_at", type: "timestamptz", notNull: true, default: "now()" },

    updatedAt: { sql: "updated_at", type: "timestamptz", notNull: true, maintainedOnWrite: true },

    storageTimezone: "UTC",

    /** Presentation converts to Asia/Tehran + Jalali (Iranian First). */

    displayTimezone: "Asia/Tehran",

  },

  softDelete: {

    column: { sql: "deleted_at", type: "timestamptz", nullable: true },

    when: "customer_visible_or_auditable",

    defaultReadsExcludeDeleted: true,

    detailAdr: "ADR-047",

  },

  optimisticLock: {

    column: { sql: "version", when: "concurrent_writers" },

    detailAdr: "ADR-043",

  },

} as const;



/**

 * Shared-database, shared-schema, row-level tenant discriminator.

 * App may use merchantId; SQL uses merchant_id. Detail isolation ADR-048.

 */

export const TENANT_ISOLATION_EXPECTATIONS = {

  model: "shared_database_shared_schema_row_discriminator",

  tenantColumn: {

    sql: "merchant_id",

    app: "merchantId",

    type: "uuid",

    requiredOnTenantTables: true,

  },

  /** Multi-store scope stays under merchant_id (ADR-006 / ADR-048). */

  storeColumn: {

    sql: "store_id",

    app: "storeId",

    type: "uuid",

    additionalScopeWhenMultiStore: true,

  },

  uniqueConstraintsTenantScoped: true,

  repositoryQueriesFilterTrustedAuthContext: true,

  platformAdminTables: "global_role_gated",

  detailAdr: "ADR-048",

  detailModule: "src/shared/contracts/multi-tenant-isolation",

} as const;



/**

 * Iranian First — UTF-8 Persian text in OLTP (product/customer names, notes).

 * No ASCII-only collations or client encodings.

 */

export const UTF8_PERSIAN_TEXT = {

  encoding: "UTF8",

  supportsPersianText: true,

  asciiOnlyCollationsForbidden: true,

  searchPlansConsiderPersian: true,

  alignsWithCompose: POSTGRES_UTF8_REQUIREMENTS,

} as const;



/** Connection configuration — no client yet (ADR-042 Drizzle). */

export const CONNECTION = {

  envVar: "DATABASE_URL",

  documentedIn: [COMPOSE_FILES.envExample, COMPOSE_FILES.compose] as const,

  pool: {

    strategy: "one_pool_per_app_instance",

    driverDeferredTo: "ADR-042",

  },

  leastPrivilegeRoles: true,

} as const;



/** Where SQL access will live once Drizzle lands — documented, not implemented here. */

export const DEFERRED_PLACEMENT = {

  schema: "src/infrastructure/database/schema/*",

  migrations: "src/infrastructure/database/migrations/*",

  client: "src/infrastructure/database/drizzle/client.ts",

  repositories: "infrastructure_implementing_domain_ports",

  orm: "drizzle",

  ormAdr: "ADR-042",

} as const;



export const POSTGRESQL_REQUIREMENTS = {

  soleOltpSot: true,

  mongoNeverOltpSot: true,

  uuidPrimaryKeys: true,

  timestamptzAuditColumns: true,

  softDeleteWhereApplicable: true,

  merchantIdIsolation: true,

  utf8PersianText: true,

  connectViaDatabaseUrl: true,

  noDrizzleInThisAdr: true,

} as const;



export function assertPostgresqlSoleOltpSot(engine: string): void {

  if (engine !== POSTGRESQL_ENGINE.name && engine !== DATA_PLANES.oltp) {

    throw new Error(

      `PostgreSQL is the sole OLTP source of truth (ADR-041); got "${engine}".`,

    );

  }

  if (!POSTGRESQL_ENGINE.soleOltpSourceOfTruth) {

    throw new Error("POSTGRESQL_ENGINE.soleOltpSourceOfTruth must be true (ADR-041).");

  }

  if (PRODUCT_ARCHITECTURE.dataPlanes.oltp !== "postgresql") {

    throw new Error(

      `PRODUCT_ARCHITECTURE.dataPlanes.oltp must be "postgresql" (ADR-041); got "${PRODUCT_ARCHITECTURE.dataPlanes.oltp}".`,

    );

  }

}



export function assertMongoNeverOltpSot(planeRole: string): void {

  if (planeRole === "oltp_source_of_truth") {

    throw new Error(

      "MongoDB must never be the OLTP source of truth (ADR-041 / ADR-056).",

    );

  }

  if (COMPOSE_DATA_PLANES.mongo.neverOltpSourceOfTruth !== true) {

    throw new Error(

      "Compose mongo plane must set neverOltpSourceOfTruth (ADR-041 / ADR-066).",

    );

  }

  if (FORBIDDEN_OLTP.mongodbAsOltpSot !== false) {

    throw new Error("FORBIDDEN_OLTP.mongodbAsOltpSot must remain false (ADR-041).");

  }

}



export function assertUuidPrimaryKeyExpectation(pkType: string): void {

  if (pkType !== UNIVERSAL_COLUMN_EXPECTATIONS.primaryKey.type) {

    throw new Error(

      `OLTP primary keys must be UUID (ADR-041); got "${pkType}".`,

    );

  }

}



export function assertTimestampStorageUtc(storageTimezone: string): void {

  if (storageTimezone !== "UTC") {

    throw new Error(

      `Timestamps must be stored in UTC (ADR-041 Iranian First); got "${storageTimezone}".`,

    );

  }

}



export function assertSoftDeleteExpectation(enabled: boolean): void {

  if (!enabled) {

    throw new Error(

      "Soft deletes are expected where entities are customer-visible or auditable (ADR-041 / ADR-047).",

    );

  }

}



export function assertMerchantIdIsolation(columnSql: string): void {

  if (columnSql !== TENANT_ISOLATION_EXPECTATIONS.tenantColumn.sql) {

    throw new Error(

      `Tenant discriminator SQL column must be "merchant_id" (ADR-041); got "${columnSql}".`,

    );

  }

  if (!TENANT_ISOLATION_EXPECTATIONS.tenantColumn.requiredOnTenantTables) {

    throw new Error("merchant_id is required on tenant tables (ADR-041).");

  }

}



export function assertUtf8PersianEncoding(encoding: string): void {

  if (encoding.toUpperCase() !== "UTF8" && encoding.toUpperCase() !== "UTF-8") {

    throw new Error(

      `PostgreSQL encoding must be UTF-8 for Persian text (ADR-041 Iranian First); got "${encoding}".`,

    );

  }

  if (!UTF8_PERSIAN_TEXT.supportsPersianText) {

    throw new Error("UTF8_PERSIAN_TEXT.supportsPersianText must be true (ADR-041).");

  }

}



export function assertDatabaseUrlConnectionKey(envVar: string): void {

  if (envVar !== CONNECTION.envVar) {

    throw new Error(

      `OLTP connection env var must be "${CONNECTION.envVar}" (ADR-041); got "${envVar}".`,

    );

  }

}



export const POSTGRESQL_ARCHITECTURE = {

  engine: POSTGRESQL_ENGINE,

  forbiddenOltp: FORBIDDEN_OLTP,

  columns: UNIVERSAL_COLUMN_EXPECTATIONS,

  tenantIsolation: TENANT_ISOLATION_EXPECTATIONS,

  utf8PersianText: UTF8_PERSIAN_TEXT,

  connection: CONNECTION,

  deferredPlacement: DEFERRED_PLACEMENT,

  requirements: POSTGRESQL_REQUIREMENTS,

  alignsWith: {

    productOltp: PRODUCT_ARCHITECTURE.dataPlanes.oltp,

    composePostgresPlane: COMPOSE_DATA_PLANES.postgres.plane,

    composePostgresRole: COMPOSE_DATA_PLANES.postgres.role,

  },

} as const;


