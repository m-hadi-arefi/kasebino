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
CREATE UNIQUE INDEX "erpnext_sync_records_internal_uq" ON "erpnext_sync_records" USING btree ("merchant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "erpnext_sync_records_merchant_status_idx" ON "erpnext_sync_records" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "erpnext_sync_records_merchant_updated_idx" ON "erpnext_sync_records" USING btree ("merchant_id","updated_at");
