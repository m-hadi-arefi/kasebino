CREATE TABLE "erpnext_sync_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_id" varchar(128),
	"erpnext_type" varchar(64),
	"erpnext_id" varchar(191),
	"status" varchar(32) NOT NULL,
	"last_sync_at" timestamp with time zone,
	"error_message_fa" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"role" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff_store_scopes" (
	"staff_membership_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "erpnext_sync_records_internal_uq" ON "erpnext_sync_records" USING btree ("merchant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "erpnext_sync_records_merchant_status_idx" ON "erpnext_sync_records" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "erpnext_sync_records_merchant_updated_idx" ON "erpnext_sync_records" USING btree ("merchant_id","updated_at");--> statement-breakpoint
CREATE INDEX "staff_memberships_merchant_id_idx" ON "staff_memberships" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "staff_memberships_auth_user_id_idx" ON "staff_memberships" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_memberships_merchant_user_uq" ON "staff_memberships" USING btree ("merchant_id","auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_store_scopes_membership_store_uq" ON "staff_store_scopes" USING btree ("staff_membership_id","store_id");