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
CREATE INDEX "staff_memberships_merchant_id_idx" ON "staff_memberships" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "staff_memberships_auth_user_id_idx" ON "staff_memberships" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_memberships_merchant_user_uq" ON "staff_memberships" USING btree ("merchant_id","auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_store_scopes_membership_store_uq" ON "staff_store_scopes" USING btree ("staff_membership_id","store_id");