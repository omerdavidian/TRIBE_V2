-- Add 'draft' to application_status enum for providers who have not yet submitted
DO $$ BEGIN
  ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
