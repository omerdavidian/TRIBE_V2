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
    alter table if exists "users"
      add column if not exists "is_active" boolean default true not null;
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
}