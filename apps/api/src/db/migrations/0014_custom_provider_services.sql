-- Custom service status enum
DO $$ BEGIN
  CREATE TYPE "public"."custom_service_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

-- Allow categoryId to be NULL for custom (non-catalog) services
ALTER TABLE "provider_services"
  ALTER COLUMN "category_id" DROP NOT NULL;
--> statement-breakpoint

ALTER TABLE "provider_services"
  ADD COLUMN IF NOT EXISTS "is_custom" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "custom_name" text,
  ADD COLUMN IF NOT EXISTS "custom_status" "public"."custom_service_status";
