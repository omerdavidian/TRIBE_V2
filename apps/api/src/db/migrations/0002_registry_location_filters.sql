ALTER TABLE "registries" ADD COLUMN IF NOT EXISTS "city" text;
--> statement-breakpoint
ALTER TABLE "registries" ADD COLUMN IF NOT EXISTS "state" text;
--> statement-breakpoint
ALTER TABLE "registries" ADD COLUMN IF NOT EXISTS "zip_code" text;
