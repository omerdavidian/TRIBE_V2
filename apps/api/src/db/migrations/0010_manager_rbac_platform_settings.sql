-- Add 'manager' to the user_role enum
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'manager';
--> statement-breakpoint

-- Manager per-module RBAC permissions
CREATE TABLE IF NOT EXISTS "manager_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "module" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Platform key→value settings store
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "label" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint

-- Internal admin/manager notification log
CREATE TABLE IF NOT EXISTS "admin_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "metadata" jsonb,
  "is_read" boolean DEFAULT false NOT NULL,
  "target_roles" text[] DEFAULT '{}' NOT NULL,
  "required_permission" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Seed default commission rate
INSERT INTO "platform_settings" ("key", "value", "label")
VALUES ('provider_commission_rate', '0.05', 'Provider Commission Rate')
ON CONFLICT ("key") DO NOTHING;
