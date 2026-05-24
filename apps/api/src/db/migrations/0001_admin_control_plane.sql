DO $$ BEGIN
  ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'business';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TYPE IF NOT EXISTS "public"."beta_invitation_status" AS ENUM('draft', 'sent', 'opened', 'accepted', 'revoked');
--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_reason" text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "beta_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "invite_code" text NOT NULL,
  "status" "beta_invitation_status" DEFAULT 'draft' NOT NULL,
  "sent_at" timestamp with time zone,
  "opened_at" timestamp with time zone,
  "accepted_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "beta_invitations_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "system_feature_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "updated_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "system_feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pass_it_forward_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_user_id" uuid NOT NULL,
  "amount_cents" integer NOT NULL,
  "note" text,
  "allocated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "enterprise_partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "budget_cents" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "enterprise_partners_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "service_price_caps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL,
  "cap_cents" integer NOT NULL,
  "updated_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_price_caps_category_id_unique" UNIQUE("category_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "admin_action_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "details" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "beta_invitations" ADD CONSTRAINT "beta_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "system_feature_flags" ADD CONSTRAINT "system_feature_flags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "pass_it_forward_allocations" ADD CONSTRAINT "pass_it_forward_allocations_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "pass_it_forward_allocations" ADD CONSTRAINT "pass_it_forward_allocations_allocated_by_users_id_fk" FOREIGN KEY ("allocated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "enterprise_partners" ADD CONSTRAINT "enterprise_partners_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "service_price_caps" ADD CONSTRAINT "service_price_caps_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "service_price_caps" ADD CONSTRAINT "service_price_caps_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

INSERT INTO "system_feature_flags" ("key", "label", "enabled")
VALUES
  ('maintenance_mode', 'Global maintenance mode', false),
  ('pause_payouts', 'Pause payouts', false),
  ('pause_new_bookings', 'Pause new bookings', false)
ON CONFLICT ("key") DO NOTHING;
