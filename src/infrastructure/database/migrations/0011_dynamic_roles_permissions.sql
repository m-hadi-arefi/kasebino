CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid,
	"name" varchar(100) NOT NULL,
	"code" varchar(50),
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role_id" uuid NOT NULL,
	"permission" varchar(50) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "staff_roles" (
	"staff_membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "roles_merchant_id_idx" ON "roles" ("merchant_id");
CREATE INDEX IF NOT EXISTS "roles_name_idx" ON "roles" ("merchant_id", "name");
CREATE INDEX IF NOT EXISTS "role_permissions_role_id_idx" ON "role_permissions" ("role_id");
CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_permission_uq" ON "role_permissions" ("role_id", "permission");
CREATE INDEX IF NOT EXISTS "staff_roles_membership_id_idx" ON "staff_roles" ("staff_membership_id");
CREATE UNIQUE INDEX IF NOT EXISTS "staff_roles_membership_role_uq" ON "staff_roles" ("staff_membership_id", "role_id");
