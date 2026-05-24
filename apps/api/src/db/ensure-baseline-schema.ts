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
      create type "public"."donation_status" as enum ('pending', 'completed', 'refunded', 'failed');
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
    create unique index if not exists "donations_stripe_session_id_unique"
      on "donations" ("stripe_session_id");
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