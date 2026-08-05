CREATE TABLE "admin_actions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" varchar(64) NOT NULL,
	"merchant_id" uuid,
	"result" varchar(32) NOT NULL,
	"reason" text,
	"reason_fa" text,
	"correlation_id" uuid NOT NULL,
	"before_status" varchar(32),
	"after_status" varchar(32),
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"login" varchar(256) NOT NULL,
	"display_name" text NOT NULL,
	"status" varchar(32) NOT NULL,
	"role" varchar(64) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone_national" varchar(11) NOT NULL,
	"phone_e164" varchar(16) NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid,
	"code" varchar(64) NOT NULL,
	"title_fa" text NOT NULL,
	"active" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone_national" varchar(11) NOT NULL,
	"phone_e164" varchar(16) NOT NULL,
	"role" varchar(32) DEFAULT 'customer' NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_otp_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone_national" varchar(11) NOT NULL,
	"phone_e164" varchar(16) NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_attempts" integer NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"audience" varchar(32) DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_otp_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone_national" varchar(11) NOT NULL,
	"phone_e164" varchar(16) NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_attempts" integer NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"key" varchar(128) NOT NULL,
	"value_json" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trade_name" text NOT NULL,
	"slug" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"contact_phone_national" varchar(11),
	"contact_phone_e164" varchar(16),
	"multi_store_enabled" boolean DEFAULT true NOT NULL,
	"settings_json" text,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid,
	"user_id" uuid,
	"audience" varchar(16) NOT NULL,
	"channel" varchar(16) NOT NULL,
	"type" varchar(64) NOT NULL,
	"title_fa" text NOT NULL,
	"body_fa" text NOT NULL,
	"source_event_id" uuid,
	"source_event_type" varchar(128),
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"membership_id" uuid,
	"customer_id" uuid,
	"fulfillment_mode" varchar(32) NOT NULL,
	"status" varchar(32) NOT NULL,
	"total_amount_minor" bigint NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"pending_payment_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"preparing_at" timestamp with time zone,
	"ready_for_pickup_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" varchar(128) NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid,
	"aggregate_id" uuid,
	"aggregate_type" varchar(64),
	"payload_json" text NOT NULL,
	"payload_version" integer DEFAULT 1 NOT NULL,
	"correlation_id" uuid NOT NULL,
	"causation_id" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(8) NOT NULL,
	"status" varchar(32) NOT NULL,
	"provider_id" varchar(64) NOT NULL,
	"provider_ref" varchar(191),
	"idempotency_key" varchar(128) NOT NULL,
	"fee_charged_minor" bigint NOT NULL,
	"failure_code" varchar(64),
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"amount_minor_per_point" bigint NOT NULL,
	"points_per_unit" integer NOT NULL,
	"expiry_months_after_last_earn" integer,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"wallet_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"store_membership_id" uuid NOT NULL,
	"entry_type" varchar(16) NOT NULL,
	"points" integer NOT NULL,
	"reference_id" varchar(128),
	"reference_kind" varchar(32),
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"consumer" varchar(64) NOT NULL,
	"processed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"sku" varchar(64) NOT NULL,
	"barcode" varchar(64) NOT NULL,
	"price_amount_minor" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sale_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sale_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"membership_id" uuid,
	"customer_id" uuid,
	"phone_national" varchar(11) NOT NULL,
	"tender_type" varchar(32) NOT NULL,
	"total_amount_minor" bigint NOT NULL,
	"status" varchar(32) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"reorder_level" integer NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"phone_national" varchar(11) NOT NULL,
	"phone_e164" varchar(16) NOT NULL,
	"source" varchar(32) NOT NULL,
	"status" varchar(32) NOT NULL,
	"consent_surface" varchar(64) NOT NULL,
	"consent_version" varchar(64) NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"display_name" text NOT NULL,
	"logo_object_key" varchar(512),
	"primary_color" varchar(16),
	"status" varchar(32) NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"province" text NOT NULL,
	"postal_code" varchar(20),
	"display_address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"hours_json" text NOT NULL,
	"qr_asset_ref" varchar(512),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"store_membership_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"balance" integer NOT NULL,
	"version" integer NOT NULL,
	"last_earn_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_actions_merchant_id_created_at_idx" ON "admin_actions" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_actions_admin_user_id_idx" ON "admin_actions" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_actions_action_idx" ON "admin_actions" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_login_uq" ON "admin_users" USING btree ("login");--> statement-breakpoint
CREATE INDEX "admin_users_status_idx" ON "admin_users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_phone_national_uq" ON "auth_users" USING btree ("phone_national");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_phone_e164_uq" ON "auth_users" USING btree ("phone_e164");--> statement-breakpoint
CREATE INDEX "categories_merchant_id_idx" ON "categories" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "categories_merchant_id_created_at_idx" ON "categories" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_merchant_id_code_uq" ON "coupons" USING btree ("merchant_id","code");--> statement-breakpoint
CREATE INDEX "coupons_merchant_id_store_id_idx" ON "coupons" USING btree ("merchant_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_identities_phone_national_uq" ON "customer_identities" USING btree ("phone_national");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_identities_phone_e164_uq" ON "customer_identities" USING btree ("phone_e164");--> statement-breakpoint
CREATE INDEX "customer_otp_challenges_phone_e164_created_at_idx" ON "customer_otp_challenges" USING btree ("phone_e164","created_at");--> statement-breakpoint
CREATE INDEX "customer_otp_challenges_phone_national_idx" ON "customer_otp_challenges" USING btree ("phone_national");--> statement-breakpoint
CREATE INDEX "customer_otp_challenges_expires_at_idx" ON "customer_otp_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "merchant_otp_challenges_phone_e164_created_at_idx" ON "merchant_otp_challenges" USING btree ("phone_e164","created_at");--> statement-breakpoint
CREATE INDEX "merchant_otp_challenges_phone_national_idx" ON "merchant_otp_challenges" USING btree ("phone_national");--> statement-breakpoint
CREATE INDEX "merchant_otp_challenges_expires_at_idx" ON "merchant_otp_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_settings_merchant_id_key_uq" ON "merchant_settings" USING btree ("merchant_id","key");--> statement-breakpoint
CREATE INDEX "merchant_settings_merchant_id_idx" ON "merchant_settings" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_slug_uq" ON "merchants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "merchants_status_idx" ON "merchants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "merchants_owner_user_id_idx" ON "merchants" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "notifications_merchant_id_user_id_created_at_idx" ON "notifications" USING btree ("merchant_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_merchant_id_created_at_idx" ON "notifications" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_merchant_id_unread_created_at_idx" ON "notifications" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_source_event_id_channel_uq" ON "notifications" USING btree ("source_event_id","channel");--> statement-breakpoint
CREATE INDEX "order_lines_order_id_idx" ON "order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_lines_merchant_id_store_id_idx" ON "order_lines" USING btree ("merchant_id","store_id");--> statement-breakpoint
CREATE INDEX "order_lines_product_id_idx" ON "order_lines" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_merchant_id_idempotency_key_uq" ON "orders" USING btree ("merchant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_merchant_id_store_id_status_created_at_idx" ON "orders" USING btree ("merchant_id","store_id","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_store_id_status_created_at_idx" ON "orders" USING btree ("store_id","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_pending_payment_at_idx" ON "orders" USING btree ("status","pending_payment_at");--> statement-breakpoint
CREATE INDEX "orders_status_ready_for_pickup_at_idx" ON "orders" USING btree ("status","ready_for_pickup_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_event_id_uq" ON "outbox_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "outbox_events_merchant_id_idx" ON "outbox_events" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "outbox_events_published_at_idx" ON "outbox_events" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "outbox_events_created_at_idx" ON "outbox_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_merchant_id_idempotency_key_uq" ON "payments" USING btree ("merchant_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_uq" ON "payments" USING btree ("provider_ref");--> statement-breakpoint
CREATE INDEX "payments_merchant_id_order_id_idx" ON "payments" USING btree ("merchant_id","order_id");--> statement-breakpoint
CREATE INDEX "payments_merchant_id_status_created_at_idx" ON "payments" USING btree ("merchant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "point_rules_merchant_id_store_id_uq" ON "point_rules" USING btree ("merchant_id","store_id");--> statement-breakpoint
CREATE INDEX "point_rules_store_id_idx" ON "point_rules" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_earn_sale_reference_uq" ON "points_ledger" USING btree ("reference_id") WHERE "points_ledger"."entry_type" = 'earn' and "points_ledger"."reference_kind" = 'sale' and "points_ledger"."reference_id" is not null;--> statement-breakpoint
CREATE INDEX "points_ledger_wallet_id_created_at_idx" ON "points_ledger" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "points_ledger_store_membership_id_created_at_idx" ON "points_ledger" USING btree ("store_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "points_ledger_merchant_id_store_id_idx" ON "points_ledger" USING btree ("merchant_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "processed_events_consumer_event_id_uq" ON "processed_events" USING btree ("consumer","event_id");--> statement-breakpoint
CREATE INDEX "products_merchant_id_idx" ON "products" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "products_merchant_id_created_at_idx" ON "products" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "products_merchant_id_barcode_uq" ON "products" USING btree ("merchant_id","barcode");--> statement-breakpoint
CREATE UNIQUE INDEX "products_merchant_id_sku_uq" ON "products" USING btree ("merchant_id","sku");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sale_lines_sale_id_idx" ON "sale_lines" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_lines_merchant_id_store_id_idx" ON "sale_lines" USING btree ("merchant_id","store_id");--> statement-breakpoint
CREATE INDEX "sale_lines_product_id_idx" ON "sale_lines" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_merchant_id_idempotency_key_uq" ON "sales" USING btree ("merchant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "sales_merchant_id_store_id_completed_at_idx" ON "sales" USING btree ("merchant_id","store_id","completed_at");--> statement-breakpoint
CREATE INDEX "sales_store_id_completed_at_idx" ON "sales" USING btree ("store_id","completed_at");--> statement-breakpoint
CREATE INDEX "sales_membership_id_idx" ON "sales" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "sales_customer_id_idx" ON "sales" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_merchant_id_status_idx" ON "sales" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_items_merchant_store_product_uq" ON "stock_items" USING btree ("merchant_id","store_id","product_id");--> statement-breakpoint
CREATE INDEX "stock_items_merchant_id_store_id_idx" ON "stock_items" USING btree ("merchant_id","store_id");--> statement-breakpoint
CREATE INDEX "stock_items_product_id_idx" ON "stock_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_memberships_store_id_phone_national_active_uq" ON "store_memberships" USING btree ("store_id","phone_national") WHERE "store_memberships"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "store_memberships_store_id_customer_id_active_uq" ON "store_memberships" USING btree ("store_id","customer_id") WHERE "store_memberships"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "store_memberships_merchant_id_store_id_idx" ON "store_memberships" USING btree ("merchant_id","store_id");--> statement-breakpoint
CREATE INDEX "store_memberships_store_id_joined_at_idx" ON "store_memberships" USING btree ("store_id","joined_at");--> statement-breakpoint
CREATE INDEX "store_memberships_customer_id_idx" ON "store_memberships" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "store_memberships_merchant_id_idx" ON "store_memberships" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_slug_uq" ON "stores" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stores_merchant_id_idx" ON "stores" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "stores_merchant_id_created_at_idx" ON "stores" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "stores_status_idx" ON "stores" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_store_membership_id_uq" ON "wallets" USING btree ("store_membership_id");--> statement-breakpoint
CREATE INDEX "wallets_merchant_id_store_id_idx" ON "wallets" USING btree ("merchant_id","store_id");--> statement-breakpoint
CREATE INDEX "wallets_customer_id_idx" ON "wallets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "wallets_last_earn_at_idx" ON "wallets" USING btree ("last_earn_at");