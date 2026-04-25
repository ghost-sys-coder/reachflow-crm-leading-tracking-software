-- Phase 5: Agency profile fields + generation_logs for AI outreach.
-- Extends profiles with per-user agency metadata injected into prompts,
-- and adds a per-generation audit table for cost tracking + rate limiting.

-- 1. Extend profiles with agency fields
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "sender_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "agency_website" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "agency_value_props" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "agency_services" text[];--> statement-breakpoint

-- 2. generation_logs table
CREATE TABLE IF NOT EXISTS "generation_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "prospect_id" uuid,
  "message_type" text NOT NULL,
  "input_tokens" integer NOT NULL,
  "output_tokens" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "generation_logs_type_valid" CHECK ("generation_logs"."message_type" IN ('instagram_dm', 'cold_email', 'follow_up', 'custom'))
);--> statement-breakpoint

ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_prospect_id_prospects_id_fk"
  FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "generation_logs_user_idx" ON "generation_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generation_logs_user_created_idx" ON "generation_logs" USING btree ("user_id","created_at");--> statement-breakpoint

-- 3. RLS: users can only see their own generation logs.
-- No INSERT policy is required because the server route uses the user's
-- authed client and sets user_id = auth.uid(); add a defensive INSERT policy
-- matching the project's pattern for other user-owned tables.
ALTER TABLE "generation_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "generation_logs_select_own" ON "generation_logs" FOR SELECT
  USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "generation_logs_insert_own" ON "generation_logs" FOR INSERT
  WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
