ALTER TABLE "registry_items" ADD COLUMN IF NOT EXISTS "service_status" text DEFAULT 'open' NOT NULL;
--> statement-breakpoint
ALTER TABLE "registry_items" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "mother_payment_accounts" ADD COLUMN IF NOT EXISTS "general_fund_balance_cents" integer DEFAULT 0 NOT NULL;
