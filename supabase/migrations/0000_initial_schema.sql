CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message_type" text NOT NULL,
	"content" text NOT NULL,
	"subject" text,
	"was_sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_type_valid" CHECK ("messages"."message_type" IN ('instagram_dm', 'cold_email', 'follow_up', 'custom'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"agency_name" text,
	"theme_preference" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_theme_valid" CHECK ("profiles"."theme_preference" IN ('default', 'midnight', 'sunset'))
);
--> statement-breakpoint
CREATE TABLE "prospect_tags" (
	"prospect_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "prospect_tags_prospect_id_tag_id_pk" PRIMARY KEY("prospect_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"platform" text NOT NULL,
	"handle" text,
	"industry" text,
	"location" text,
	"website_url" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"notes" text,
	"follow_up_at" timestamp with time zone,
	"last_contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_platform_valid" CHECK ("prospects"."platform" IN ('instagram', 'email', 'facebook', 'linkedin', 'twitter', 'other')),
	CONSTRAINT "prospects_status_valid" CHECK ("prospects"."status" IN ('sent', 'waiting', 'replied', 'booked', 'closed', 'dead'))
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_user_name_uq" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_tags" ADD CONSTRAINT "prospect_tags_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_tags" ADD CONSTRAINT "prospect_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_prospect_idx" ON "messages" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "messages_user_idx" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prospects_user_idx" ON "prospects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prospects_user_status_idx" ON "prospects" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "prospects_user_created_idx" ON "prospects" USING btree ("user_id","created_at");--> statement-breakpoint

-- ============================================================
-- Hand-written trailer: RLS policies, auto-profile trigger,
-- and moddatetime triggers. Drizzle-kit does not regenerate
-- this file, so the trailer is safe to extend here.
-- ============================================================

-- Enable moddatetime for updated_at triggers
CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";--> statement-breakpoint

-- Enable RLS on every user-owned table
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "prospects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "prospect_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- profiles: users read/update only their own row. INSERT is done by
-- the handle_new_user trigger under SECURITY DEFINER, so no INSERT
-- policy is required for app traffic; defensive policy permits the
-- authenticated user to create a row matching their auth.uid().
CREATE POLICY "profiles_select_own" ON "profiles" FOR SELECT
  USING (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "profiles_insert_own" ON "profiles" FOR INSERT
  WITH CHECK (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles" FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);--> statement-breakpoint

-- prospects
CREATE POLICY "prospects_select_own" ON "prospects" FOR SELECT
  USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "prospects_insert_own" ON "prospects" FOR INSERT
  WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "prospects_update_own" ON "prospects" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "prospects_delete_own" ON "prospects" FOR DELETE
  USING (auth.uid() = user_id);--> statement-breakpoint

-- messages
CREATE POLICY "messages_select_own" ON "messages" FOR SELECT
  USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "messages_insert_own" ON "messages" FOR INSERT
  WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "messages_update_own" ON "messages" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "messages_delete_own" ON "messages" FOR DELETE
  USING (auth.uid() = user_id);--> statement-breakpoint

-- tags
CREATE POLICY "tags_select_own" ON "tags" FOR SELECT
  USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tags_insert_own" ON "tags" FOR INSERT
  WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tags_update_own" ON "tags" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tags_delete_own" ON "tags" FOR DELETE
  USING (auth.uid() = user_id);--> statement-breakpoint

-- prospect_tags: junction table. Authorize based on the parent
-- prospect's ownership (which also implies tag ownership when both
-- rows are inserted under the same auth.uid).
CREATE POLICY "prospect_tags_select_own" ON "prospect_tags" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "prospects"
      WHERE "prospects"."id" = "prospect_tags"."prospect_id"
        AND "prospects"."user_id" = auth.uid()
    )
  );--> statement-breakpoint
CREATE POLICY "prospect_tags_insert_own" ON "prospect_tags" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "prospects"
      WHERE "prospects"."id" = "prospect_tags"."prospect_id"
        AND "prospects"."user_id" = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM "tags"
      WHERE "tags"."id" = "prospect_tags"."tag_id"
        AND "tags"."user_id" = auth.uid()
    )
  );--> statement-breakpoint
CREATE POLICY "prospect_tags_delete_own" ON "prospect_tags" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "prospects"
      WHERE "prospects"."id" = "prospect_tags"."prospect_id"
        AND "prospects"."user_id" = auth.uid()
    )
  );--> statement-breakpoint

-- Auto-create a profiles row when a new auth.users row is inserted.
-- SECURITY DEFINER bypasses RLS; SET search_path hardens against
-- search_path injection per Supabase security guidance.
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO "public"."profiles" ("id", "full_name")
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";--> statement-breakpoint
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();--> statement-breakpoint

-- moddatetime triggers keep updated_at current on every row update
CREATE TRIGGER "profiles_set_updated_at"
  BEFORE UPDATE ON "profiles"
  FOR EACH ROW EXECUTE PROCEDURE "extensions"."moddatetime"("updated_at");--> statement-breakpoint
CREATE TRIGGER "prospects_set_updated_at"
  BEFORE UPDATE ON "prospects"
  FOR EACH ROW EXECUTE PROCEDURE "extensions"."moddatetime"("updated_at");