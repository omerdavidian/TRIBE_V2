DO $$ BEGIN
 CREATE TYPE "public"."payment_type" AS ENUM('monetary', 'community');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."payment_type" ADD VALUE IF NOT EXISTS 'monetary';
 ALTER TYPE "public"."payment_type" ADD VALUE IF NOT EXISTS 'community';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."frequency_unit" AS ENUM('per_day', 'per_week');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."frequency_unit" ADD VALUE IF NOT EXISTS 'per_day';
 ALTER TYPE "public"."frequency_unit" ADD VALUE IF NOT EXISTS 'per_week';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "provider_services" ADD COLUMN IF NOT EXISTS "payment_type" "payment_type" DEFAULT 'monetary' NOT NULL;
--> statement-breakpoint
ALTER TABLE "provider_services" ADD COLUMN IF NOT EXISTS "frequency_unit" "frequency_unit";
--> statement-breakpoint
ALTER TABLE "provider_services" ADD COLUMN IF NOT EXISTS "quantity_requested" integer;
--> statement-breakpoint
ALTER TABLE "provider_services" ADD COLUMN IF NOT EXISTS "quantity_fulfilled" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "registry_items" ADD COLUMN IF NOT EXISTS "payment_type" "payment_type" DEFAULT 'monetary' NOT NULL;
--> statement-breakpoint
ALTER TABLE "registry_items" ADD COLUMN IF NOT EXISTS "frequency_unit" "frequency_unit";
--> statement-breakpoint
ALTER TABLE "registry_items" ADD COLUMN IF NOT EXISTS "quantity_requested" integer;
--> statement-breakpoint
ALTER TABLE "registry_items" ADD COLUMN IF NOT EXISTS "quantity_fulfilled" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_signups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "registry_id" uuid NOT NULL,
  "registry_item_id" uuid NOT NULL,
  "mother_user_id" uuid NOT NULL,
  "volunteer_user_id" uuid,
  "volunteer_name" text,
  "volunteer_email" text,
  "scheduled_for" timestamp with time zone NOT NULL,
  "notes" text,
  "status" text DEFAULT 'confirmed' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_signups" ADD CONSTRAINT "service_signups_registry_id_registries_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_signups" ADD CONSTRAINT "service_signups_registry_item_id_registry_items_id_fk" FOREIGN KEY ("registry_item_id") REFERENCES "public"."registry_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_signups" ADD CONSTRAINT "service_signups_mother_user_id_users_id_fk" FOREIGN KEY ("mother_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_signups" ADD CONSTRAINT "service_signups_volunteer_user_id_users_id_fk" FOREIGN KEY ("volunteer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_signups_registry_item_idx" ON "service_signups" ("registry_item_id", "scheduled_for");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_signups_mother_idx" ON "service_signups" ("mother_user_id", "scheduled_for");
