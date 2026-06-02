-- Provider verification document types
DO $$ BEGIN
  CREATE TYPE "public"."provider_document_type" AS ENUM (
    'ein_certificate',
    'irs_letter',
    'w2',
    'identity_front',
    'identity_back',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Table for provider KYC / business verification documents
CREATE TABLE IF NOT EXISTS "provider_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_profile_id" uuid NOT NULL REFERENCES "provider_profiles"("id") ON DELETE CASCADE,
  "document_type" "public"."provider_document_type" NOT NULL,
  "stripe_file_id" text,
  "original_filename" text NOT NULL,
  "file_size_bytes" integer,
  "mime_type" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "provider_documents_profile_idx"
  ON "provider_documents" ("provider_profile_id");
