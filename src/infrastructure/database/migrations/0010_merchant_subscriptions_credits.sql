CREATE TABLE IF NOT EXISTS "merchant_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"plan_code" varchar(32) DEFAULT 'pilot' NOT NULL,
	"fee_bps" integer DEFAULT 0 NOT NULL,
	"features_json" text,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "merchant_credit_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"reason" varchar(64) NOT NULL,
	"reference_id" varchar(128),
	"created_at" timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "merchant_subscriptions_merchant_id_uq" ON "merchant_subscriptions" ("merchant_id");
CREATE INDEX IF NOT EXISTS "merchant_subscriptions_plan_code_idx" ON "merchant_subscriptions" ("plan_code");
CREATE INDEX IF NOT EXISTS "merchant_credit_ledger_merchant_id_idx" ON "merchant_credit_ledger" ("merchant_id");
CREATE INDEX IF NOT EXISTS "merchant_credit_ledger_merchant_created_idx" ON "merchant_credit_ledger" ("merchant_id", "created_at");
