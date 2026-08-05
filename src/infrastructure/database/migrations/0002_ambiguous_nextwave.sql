CREATE TABLE "outbox_dead_letters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"outbox_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" varchar(128) NOT NULL,
	"merchant_id" uuid NOT NULL,
	"store_id" uuid,
	"payload_json" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"last_error" text NOT NULL,
	"dead_lettered_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_dead_letters_outbox_id_uq" ON "outbox_dead_letters" USING btree ("outbox_id");--> statement-breakpoint
CREATE INDEX "outbox_dead_letters_event_id_idx" ON "outbox_dead_letters" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "outbox_dead_letters_merchant_id_idx" ON "outbox_dead_letters" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "outbox_dead_letters_dead_lettered_at_idx" ON "outbox_dead_letters" USING btree ("dead_lettered_at");