/**
 * Identity OLTP tables (ADR-092 / ADR-031 / ADR-032).
 *
 * Merchant AuthUser + OTP challenges and CustomerIdentity + OTP challenges.
 * Hashed OTP only at rest; Iranian phone national `09…` + E.164.
 * Migrations via Drizzle Kit → `src/infrastructure/database/migrations/`.
 */

import {
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
