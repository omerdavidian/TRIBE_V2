-- Provider profile segmentation: business (public) vs personal (admin-only)

ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "business_address" text,
  ADD COLUMN IF NOT EXISTS "owner_name" text,
  ADD COLUMN IF NOT EXISTS "owner_direct_email" text,
  ADD COLUMN IF NOT EXISTS "owner_direct_phone" text;
