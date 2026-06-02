ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "supporter_name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "supporter_email_snapshot" text;