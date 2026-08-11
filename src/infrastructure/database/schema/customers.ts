/**
 * Kasbino CRM Domain Tables (ADR-007 / ADR-043 / ADR-048).
 *
 * Scoped by merchant_id for multi-tenant isolation.
 * Persian text columns use standard text/varchar; timestamps in UTC timestamptz.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Core Kasbino Merchant Customer entity. */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id"),
    /** Iranian national mobile: 09xxxxxxxxx */
    phoneNational: varchar("phone_national", { length: 11 }).notNull(),
    /** E.164: +989xxxxxxxxx */
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    email: text("email"),
    displayName: text("display_name").notNull(),
    birthday: timestamp("birthday", { withTimezone: true, mode: "date" }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    /** retail | wholesale */
    customerType: varchar("customer_type", { length: 32 }).notNull().default("retail"),
    /** active | inactive | vip | blocked | archived */
    status: varchar("status", { length: 32 }).notNull().default("active"),
    /** phone | sms | email | whatsapp */
    preferredContactMethod: varchar("preferred_contact_method", { length: 32 })
      .notNull()
      .default("phone"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    uniqueIndex("customers_merchant_id_phone_national_active_uq")
      .on(t.merchantId, t.phoneNational)
      .where(sql`${t.deletedAt} is null`),
    index("customers_merchant_id_idx").on(t.merchantId),
    index("customers_merchant_id_status_idx").on(t.merchantId, t.status),
    index("customers_merchant_id_phone_national_idx").on(
      t.merchantId,
      t.phoneNational,
    ),
  ],
);

/** Merchant-scoped tag definitions (e.g. VIP, High Value, Wholesale). */
export const crmTags = pgTable(
  "crm_tags",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    color: varchar("color", { length: 32 }).notNull().default("blue"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("crm_tags_merchant_id_name_uq").on(t.merchantId, t.name),
    index("crm_tags_merchant_id_idx").on(t.merchantId),
  ],
);

/** Junction table for customer tags. */
export const customerTags = pgTable(
  "customer_tags",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("customer_tags_customer_id_tag_id_uq").on(t.customerId, t.tagId),
    index("customer_tags_merchant_id_customer_id_idx").on(
      t.merchantId,
      t.customerId,
    ),
  ],
);

/** Staff notes attached to customer profiles. */
export const customerNotes = pgTable(
  "customer_notes",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    authorId: uuid("author_id").notNull(),
    authorName: text("author_name").notNull(),
    content: text("content").notNull(),
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    index("customer_notes_merchant_customer_idx").on(
      t.merchantId,
      t.customerId,
    ),
  ],
);

/** Staff interaction logs (calls, visits, messages). */
export const customerInteractions = pgTable(
  "customer_interactions",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    storeId: uuid("store_id"),
    staffId: uuid("staff_id").notNull(),
    staffName: text("staff_name").notNull(),
    /** call | message | visit | follow_up | note | other */
    type: varchar("type", { length: 32 }).notNull(),
    description: text("description").notNull(),
    interactionDate: timestamp("interaction_date", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    followUpDate: timestamp("follow_up_date", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    index("customer_interactions_merchant_customer_idx").on(
      t.merchantId,
      t.customerId,
    ),
  ],
);

/** Customer follow-up tasks assigned to staff. */
export const customerFollowUps = pgTable(
  "customer_follow_ups",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    storeId: uuid("store_id"),
    assigneeId: uuid("assignee_id").notNull(),
    assigneeName: text("assignee_name").notNull(),
    description: text("description").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }).notNull(),
    /** OPEN | DONE | CANCELLED */
    status: varchar("status", { length: 32 }).notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    index("customer_follow_ups_merchant_status_idx").on(
      t.merchantId,
      t.status,
    ),
    index("customer_follow_ups_customer_id_idx").on(t.customerId),
  ],
);
