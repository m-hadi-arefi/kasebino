CREATE TABLE "analytics_customer_stats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"new_memberships" integer DEFAULT 0 NOT NULL,
	"sales_with_phone" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_daily_revenue" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"revenue_minor" bigint NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_projection_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"applied_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_retention_stats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"purchase_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_customer_stats_merchant_store_day_uq" ON "analytics_customer_stats" USING btree ("merchant_id","store_id","day");--> statement-breakpoint
CREATE INDEX "analytics_customer_stats_merchant_day_idx" ON "analytics_customer_stats" USING btree ("merchant_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_revenue_merchant_store_day_uq" ON "analytics_daily_revenue" USING btree ("merchant_id","store_id","day");--> statement-breakpoint
CREATE INDEX "analytics_daily_revenue_merchant_day_idx" ON "analytics_daily_revenue" USING btree ("merchant_id","day");--> statement-breakpoint
CREATE INDEX "analytics_projection_events_merchant_idx" ON "analytics_projection_events" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_retention_stats_membership_day_uq" ON "analytics_retention_stats" USING btree ("membership_id","day");--> statement-breakpoint
CREATE INDEX "analytics_retention_stats_merchant_day_idx" ON "analytics_retention_stats" USING btree ("merchant_id","day");