CREATE TABLE IF NOT EXISTS "support_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"bio" text,
	"hero_image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_pages_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "support_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "support_pages" ADD CONSTRAINT "support_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
