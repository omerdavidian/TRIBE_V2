ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_real_user" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "is_test_data" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "service_signups" ADD COLUMN IF NOT EXISTS "is_test_data" boolean DEFAULT false NOT NULL;