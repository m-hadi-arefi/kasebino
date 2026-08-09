CREATE TABLE "external_entity_mappings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"external_id" varchar(191) NOT NULL,
	"external_secondary_id" varchar(191),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"stock_item_id" uuid NOT NULL,
	"quantity_delta" integer NOT NULL,
	"unit_code" varchar(32) DEFAULT 'piece' NOT NULL,
	"reason" varchar(32) NOT NULL,
	"reference_type" varchar(64),
	"reference_id" varchar(128),
	"source" varchar(64) NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "base_unit_code" varchar(32) DEFAULT 'piece' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "quantity_scale" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "receipt_object_key" varchar(512);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "receipt_content_type" varchar(128);--> statement-breakpoint
CREATE UNIQUE INDEX "external_entity_mappings_internal_uq" ON "external_entity_mappings" USING btree ("merchant_id","provider","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_entity_mappings_external_uq" ON "external_entity_mappings" USING btree ("merchant_id","provider","entity_type","external_id");--> statement-breakpoint
CREATE INDEX "external_entity_mappings_merchant_id_idx" ON "external_entity_mappings" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "external_entity_mappings_provider_entity_type_idx" ON "external_entity_mappings" USING btree ("provider","entity_type");--> statement-breakpoint
CREATE INDEX "stock_movements_merchant_store_occurred_idx" ON "stock_movements" USING btree ("merchant_id","store_id","occurred_at");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_stock_item_id_idx" ON "stock_movements" USING btree ("stock_item_id");--> statement-breakpoint
CREATE INDEX "stock_movements_reference_idx" ON "stock_movements" USING btree ("reference_type","reference_id");