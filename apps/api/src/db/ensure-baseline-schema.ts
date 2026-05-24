import { sql } from 'drizzle-orm'
import { db } from './client.js'

/**
 * Applies non-destructive compatibility DDL so older databases do not crash
 * newer API builds during rollout.
 */
export async function ensureBaselineSchema() {
  await db.execute(sql`
    do $$ begin
      alter type "public"."user_role" add value if not exists 'business';
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      create type "public"."auth_provider" as enum ('email', 'google', 'apple');
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      alter type "public"."auth_provider" add value if not exists 'email';
      alter type "public"."auth_provider" add value if not exists 'google';
      alter type "public"."auth_provider" add value if not exists 'apple';
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      create type "public"."application_status" as enum ('pending', 'approved', 'rejected');
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      alter type "public"."application_status" add value if not exists 'pending';
      alter type "public"."application_status" add value if not exists 'approved';
      alter type "public"."application_status" add value if not exists 'rejected';
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      create type "public"."booking_status" as enum ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed');
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      alter type "public"."booking_status" add value if not exists 'pending';
      alter type "public"."booking_status" add value if not exists 'confirmed';
      alter type "public"."booking_status" add value if not exists 'in_progress';
      alter type "public"."booking_status" add value if not exists 'completed';
      alter type "public"."booking_status" add value if not exists 'cancelled';
      alter type "public"."booking_status" add value if not exists 'disputed';
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      create type "public"."donation_status" as enum ('pending', 'completed', 'refunded', 'failed');
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      create type "public"."beta_invitation_status" as enum ('draft', 'sent', 'opened', 'accepted', 'revoked');
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      alter type "public"."beta_invitation_status" add value if not exists 'draft';
      alter type "public"."beta_invitation_status" add value if not exists 'sent';
      alter type "public"."beta_invitation_status" add value if not exists 'opened';
      alter type "public"."beta_invitation_status" add value if not exists 'accepted';
      alter type "public"."beta_invitation_status" add value if not exists 'revoked';
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    do $$ begin
      alter type "public"."donation_status" add value if not exists 'pending';
      alter type "public"."donation_status" add value if not exists 'completed';
      alter type "public"."donation_status" add value if not exists 'refunded';
      alter type "public"."donation_status" add value if not exists 'failed';
    exception
      when duplicate_object then null;
    end $$;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "is_active" boolean default true not null;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "avatar_url" text;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "role" "public"."user_role" default 'supporter' not null;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "full_name" text;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "auth_provider" "public"."auth_provider" default 'email' not null;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "google_id" text;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "apple_id" text;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "email_verification_token" text;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "password_reset_token" text;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "password_reset_expires_at" timestamp with time zone;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "suspended_at" timestamp with time zone;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "suspended_reason" text;
  `)

  await db.execute(sql`
    alter table if exists "users"
      add column if not exists "updated_at" timestamp with time zone default now() not null;
  `)

  await db.execute(sql`
    create table if not exists "service_categories" (
      "id" uuid primary key default gen_random_uuid() not null,
      "slug" text not null unique,
      "name" text not null,
      "description" text,
      "icon_name" text,
      "sort_order" integer not null default 0,
      "is_active" boolean not null default true
    );
  `)

  await db.execute(sql`
    create table if not exists "provider_profiles" (
      "id" uuid primary key default gen_random_uuid() not null,
      "user_id" uuid not null unique,
      "business_name" text,
      "bio" text,
      "service_areas" text[] not null default '{}',
      "avatar_url" text,
      "website_url" text,
      "stripe_account_id" text,
      "stripe_onboarding_completed" boolean not null default false,
      "application_status" "public"."application_status" not null default 'pending',
      "review_note" text,
      "reviewed_at" timestamp with time zone,
      "created_at" timestamp with time zone not null default now(),
      "updated_at" timestamp with time zone not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists "provider_services" (
      "id" uuid primary key default gen_random_uuid() not null,
      "provider_profile_id" uuid not null,
      "category_id" uuid not null,
      "price_min_cents" integer,
      "price_max_cents" integer,
      "description" text
    );
  `)

  await db.execute(sql`
    create table if not exists "registries" (
      "id" uuid primary key default gen_random_uuid() not null,
      "user_id" uuid not null,
      "slug" text not null unique,
      "title" text not null,
      "description" text,
      "due_date" timestamp with time zone,
      "is_published" boolean not null default false,
      "cover_image_url" text,
      "target_amount_cents" integer,
      "created_at" timestamp with time zone not null default now(),
      "updated_at" timestamp with time zone not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists "registry_items" (
      "id" uuid primary key default gen_random_uuid() not null,
      "registry_id" uuid not null,
      "category_id" uuid,
      "provider_profile_id" uuid,
      "title" text not null,
      "description" text,
      "target_amount_cents" integer not null,
      "funded_amount_cents" integer not null default 0,
      "is_fulfilled" boolean not null default false,
      "sort_order" integer not null default 0
    );
  `)

  await db.execute(sql`
    create table if not exists "waitlist" (
      "id" uuid primary key default gen_random_uuid() not null,
      "email" text not null unique,
      "source" text default 'website',
      "created_at" timestamp with time zone default now() not null,
      "unsubscribed_at" timestamp with time zone
    );
  `)

  await db.execute(sql`
    alter table if exists "waitlist"
      add column if not exists "source" text default 'website';
  `)

  await db.execute(sql`
    alter table if exists "waitlist"
      add column if not exists "unsubscribed_at" timestamp with time zone;
  `)

  await db.execute(sql`
    create table if not exists "donations" (
      "id" uuid primary key default gen_random_uuid() not null,
      "supporter_id" uuid,
      "registry_item_id" uuid,
      "registry_id" uuid,
      "amount_cents" integer not null default 0,
      "stripe_session_id" text,
      "stripe_payment_intent_id" text,
      "status" "public"."donation_status" not null default 'pending',
      "message" text,
      "is_anonymous" boolean not null default false,
      "created_at" timestamp with time zone not null default now(),
      "completed_at" timestamp with time zone
    );
  `)

  await db.execute(sql`
    create table if not exists "bookings" (
      "id" uuid primary key default gen_random_uuid() not null,
      "mother_id" uuid not null,
      "provider_id" uuid not null,
      "provider_service_id" uuid,
      "scheduled_at" timestamp with time zone,
      "duration_minutes" integer,
      "amount_cents" integer not null default 0,
      "platform_fee_percent" integer not null default 10,
      "stripe_session_id" text,
      "stripe_payment_intent_id" text,
      "stripe_transfer_id" text,
      "status" "public"."booking_status" not null default 'pending',
      "notes" text,
      "cancellation_reason" text,
      "created_at" timestamp with time zone not null default now(),
      "updated_at" timestamp with time zone not null default now()
    );
  `)

  await db.execute(sql`
    create unique index if not exists "bookings_stripe_session_id_unique"
      on "bookings" ("stripe_session_id");
  `)

  await db.execute(sql`
    create unique index if not exists "donations_stripe_session_id_unique"
      on "donations" ("stripe_session_id");
  `)

  await db.execute(sql`
    create table if not exists "beta_invitations" (
      "id" uuid primary key default gen_random_uuid() not null,
      "email" text not null,
      "invite_code" text not null unique,
      "status" "public"."beta_invitation_status" not null default 'draft',
      "sent_at" timestamp with time zone,
      "opened_at" timestamp with time zone,
      "accepted_at" timestamp with time zone,
      "created_by" uuid,
      "created_at" timestamp with time zone not null default now(),
      "updated_at" timestamp with time zone not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists "pass_it_forward_allocations" (
      "id" uuid primary key default gen_random_uuid() not null,
      "recipient_user_id" uuid not null,
      "amount_cents" integer not null,
      "note" text,
      "allocated_by" uuid,
      "created_at" timestamp with time zone not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists "enterprise_partners" (
      "id" uuid primary key default gen_random_uuid() not null,
      "name" text not null,
      "domain" text not null unique,
      "budget_cents" integer not null default 0,
      "is_active" boolean not null default true,
      "created_by" uuid,
      "created_at" timestamp with time zone not null default now(),
      "updated_at" timestamp with time zone not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists "service_price_caps" (
      "id" uuid primary key default gen_random_uuid() not null,
      "category_id" uuid not null unique,
      "cap_cents" integer not null,
      "updated_by" uuid,
      "updated_at" timestamp with time zone not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists "admin_action_logs" (
      "id" uuid primary key default gen_random_uuid() not null,
      "admin_user_id" uuid not null,
      "action" text not null,
      "target_type" text,
      "target_id" text,
      "details" text,
      "created_at" timestamp with time zone not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists "system_feature_flags" (
      "id" uuid primary key default gen_random_uuid() not null,
      "key" text not null unique,
      "label" text not null,
      "enabled" boolean default true not null,
      "updated_by" uuid,
      "updated_at" timestamp with time zone default now() not null
    );
  `)

  await db.execute(sql`
    insert into "system_feature_flags" ("key", "label", "enabled")
    values
      ('maintenance_mode', 'Global maintenance mode', false),
      ('pause_payouts', 'Pause payouts', false),
      ('pause_new_bookings', 'Pause new bookings', false)
    on conflict ("key") do nothing;
  `)
}