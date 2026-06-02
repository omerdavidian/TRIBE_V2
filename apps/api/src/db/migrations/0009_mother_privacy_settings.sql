ALTER TABLE "mother_profiles" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "mother_profiles" ADD COLUMN IF NOT EXISTS "email_notifications_enabled" boolean DEFAULT true NOT NULL;
