/**
 * Identity OLTP tables (ADR-092 / ADR-031 / ADR-032).
 *
 * Merchant AuthUser + OTP challenges and CustomerIdentity + OTP challenges.
 * Hashed OTP only at rest; Iranian phone national `09…` + E.164.
 * Migrations via Drizzle Kit → `src/infrastructure/database/migrations/`.
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Merchant staff auth users (never customer audience). */
export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey(),
    /** Iranian national mobile: 09xxxxxxxxx */
    phoneNational: varchar("phone_national", { length: 11 }).notNull(),
    /** E.164: +989xxxxxxxxx */
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (t) => [
    uniqueIndex("auth_users_phone_national_uq").on(t.phoneNational),
    uniqueIndex("auth_users_phone_e164_uq").on(t.phoneE164),
  ],
);

/** Merchant OTP challenges — code_hash only (never plaintext OTP). */
export const merchantOtpChallenges = pgTable(
  "merchant_otp_challenges",
  {
    id: uuid("id").primaryKey(),
    phoneNational: varchar("phone_national", { length: 11 }).notNull(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    maxAttempts: integer("max_attempts").notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("merchant_otp_challenges_phone_e164_created_at_idx").on(
      t.phoneE164,
      t.createdAt,
    ),
    index("merchant_otp_challenges_phone_national_idx").on(t.phoneNational),
    index("merchant_otp_challenges_expires_at_idx").on(t.expiresAt),
  ],
);

/** Customer identity (store PWA / OTP audience) — never staff. */
export const customerIdentities = pgTable(
  "customer_identities",
  {
    id: uuid("id").primaryKey(),
    phoneNational: varchar("phone_national", { length: 11 }).notNull(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    /** Fixed audience role — customer */
    role: varchar("role", { length: 32 }).notNull().default("customer"),
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (t) => [
    uniqueIndex("customer_identities_phone_national_uq").on(t.phoneNational),
    uniqueIndex("customer_identities_phone_e164_uq").on(t.phoneE164),
  ],
);

/** Customer OTP challenges — isolated from merchant_otp_challenges. */
export const customerOtpChallenges = pgTable(
  "customer_otp_challenges",
  {
    id: uuid("id").primaryKey(),
    phoneNational: varchar("phone_national", { length: 11 }).notNull(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    maxAttempts: integer("max_attempts").notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", {
      withTimezone: true,
      mode: "date",
    }),
    /** Audience tag — customer */
    audience: varchar("audience", { length: 32 }).notNull().default("customer"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("customer_otp_challenges_phone_e164_created_at_idx").on(
      t.phoneE164,
      t.createdAt,
    ),
    index("customer_otp_challenges_phone_national_idx").on(t.phoneNational),
    index("customer_otp_challenges_expires_at_idx").on(t.expiresAt),
  ],
);

/** Merchant staff memberships (RBAC roles). */
export const staffMemberships = pgTable(
  "staff_memberships",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    authUserId: uuid("auth_user_id").notNull(),
    role: varchar("role", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (t) => [
    index("staff_memberships_merchant_id_idx").on(t.merchantId),
    index("staff_memberships_auth_user_id_idx").on(t.authUserId),
    uniqueIndex("staff_memberships_merchant_user_uq").on(t.merchantId, t.authUserId),
  ],
);

/** Store-specific access scopes for staff. */
export const staffStoreScopes = pgTable(
  "staff_store_scopes",
  {
    staffMembershipId: uuid("staff_membership_id").notNull(),
    storeId: uuid("store_id").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("staff_store_scopes_membership_store_uq").on(t.staffMembershipId, t.storeId),
  ],
);

/** Tenant and system roles */
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id"),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (t) => [
    index("roles_merchant_id_idx").on(t.merchantId),
    index("roles_name_idx").on(t.merchantId, t.name),
  ],
);

/** Dynamic role-to-permission mapping */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey(),
    roleId: uuid("role_id").notNull(),
    permission: varchar("permission", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("role_permissions_role_id_idx").on(t.roleId),
    uniqueIndex("role_permissions_role_permission_uq").on(t.roleId, t.permission),
  ],
);

/** Staff membership to roles mapping (multi-role support) */
export const staffRoles = pgTable(
  "staff_roles",
  {
    staffMembershipId: uuid("staff_membership_id").notNull(),
    roleId: uuid("role_id").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("staff_roles_membership_id_idx").on(t.staffMembershipId),
    uniqueIndex("staff_roles_membership_role_uq").on(t.staffMembershipId, t.roleId),
  ],
);

