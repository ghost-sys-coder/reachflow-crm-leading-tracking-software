-- Phase 6: Multi-tenant organizations, roles, and org-scoped data isolation


-- ============================================================
-- PART 1: NEW TABLES
-- ============================================================

CREATE TABLE organizations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  slug                text NOT NULL UNIQUE,
  plan                text NOT NULL DEFAULT 'free',
  agency_name         text,
  sender_name         text,
  agency_website      text,
  agency_value_props  text,
  agency_services     text[],
  created_at          timestamp with time zone NOT NULL DEFAULT now(),
  updated_at          timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE organization_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer',
  invited_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id),
  CONSTRAINT org_members_role_valid CHECK (role IN ('admin', 'editor', 'viewer'))
);--> statement-breakpoint

CREATE TABLE organization_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'viewer',
  token       text NOT NULL UNIQUE,
  expires_at  timestamp with time zone NOT NULL,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT org_invites_role_valid CHECK (role IN ('admin', 'editor', 'viewer'))
);--> statement-breakpoint


-- ============================================================
-- PART 2: ADD org_id COLUMNS TO EXISTING TABLES
-- ============================================================

ALTER TABLE prospects       ADD COLUMN org_id uuid;--> statement-breakpoint
ALTER TABLE messages        ADD COLUMN org_id uuid;--> statement-breakpoint
ALTER TABLE tags            ADD COLUMN org_id uuid;--> statement-breakpoint
ALTER TABLE generation_logs ADD COLUMN org_id uuid;--> statement-breakpoint


-- ============================================================
-- PART 3: DATA MIGRATION
-- one org per existing user, backfill org_id on all data rows
-- ============================================================

DO $$
DECLARE
  rec        RECORD;
  new_org_id uuid;
  org_name   text;
  org_slug   text;
BEGIN
  FOR rec IN SELECT * FROM profiles LOOP
    org_name := COALESCE(
      NULLIF(TRIM(rec.agency_name), ''),
      rec.full_name,
      'My Agency'
    );
    org_slug := lower(regexp_replace(org_name, '[^a-z0-9]+', '-', 'g'))
                || '-' || substr(md5(rec.id::text), 1, 6);

    INSERT INTO organizations (
      name, slug,
      agency_name, sender_name, agency_website, agency_value_props, agency_services
    )
    VALUES (
      org_name, org_slug,
      rec.agency_name, rec.sender_name, rec.agency_website,
      rec.agency_value_props, rec.agency_services
    )
    RETURNING id INTO new_org_id;

    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, rec.id, 'admin');

    UPDATE prospects       SET org_id = new_org_id WHERE user_id = rec.id;
    UPDATE messages        SET org_id = new_org_id WHERE user_id = rec.id;
    UPDATE tags            SET org_id = new_org_id WHERE user_id = rec.id;
    UPDATE generation_logs SET org_id = new_org_id WHERE user_id = rec.id;
  END LOOP;
END;
$$;--> statement-breakpoint


-- ============================================================
-- PART 4: ENFORCE NOT NULL, FOREIGN KEYS, INDEXES
-- ============================================================

ALTER TABLE prospects       ALTER COLUMN org_id SET NOT NULL;--> statement-breakpoint
ALTER TABLE messages        ALTER COLUMN org_id SET NOT NULL;--> statement-breakpoint
ALTER TABLE tags            ALTER COLUMN org_id SET NOT NULL;--> statement-breakpoint
ALTER TABLE generation_logs ALTER COLUMN org_id SET NOT NULL;--> statement-breakpoint

ALTER TABLE prospects ADD CONSTRAINT prospects_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE messages ADD CONSTRAINT messages_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE tags ADD CONSTRAINT tags_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE generation_logs ADD CONSTRAINT generation_logs_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;--> statement-breakpoint

ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_user_name_uq;--> statement-breakpoint
ALTER TABLE tags ADD CONSTRAINT tags_org_name_uq UNIQUE (org_id, name);--> statement-breakpoint

CREATE INDEX prospects_org_idx         ON prospects (org_id);--> statement-breakpoint
CREATE INDEX prospects_org_status_idx  ON prospects (org_id, status);--> statement-breakpoint
CREATE INDEX prospects_org_created_idx ON prospects (org_id, created_at);--> statement-breakpoint
CREATE INDEX messages_org_idx          ON messages (org_id);--> statement-breakpoint
CREATE INDEX tags_org_idx              ON tags (org_id);--> statement-breakpoint
CREATE INDEX generation_logs_org_idx   ON generation_logs (org_id);--> statement-breakpoint
CREATE INDEX generation_logs_org_created_idx ON generation_logs (org_id, created_at);--> statement-breakpoint
CREATE INDEX org_members_org_idx       ON organization_members (org_id);--> statement-breakpoint
CREATE INDEX org_members_user_idx      ON organization_members (user_id);--> statement-breakpoint
CREATE INDEX org_invites_org_idx       ON organization_invites (org_id);--> statement-breakpoint
CREATE INDEX org_invites_token_idx     ON organization_invites (token);--> statement-breakpoint


-- ============================================================
-- PART 5: DROP user_id FROM NON-MESSAGE TABLES
-- messages keeps user_id for authorship tracking
-- ============================================================

DROP INDEX IF EXISTS prospects_user_idx;--> statement-breakpoint
DROP INDEX IF EXISTS prospects_user_status_idx;--> statement-breakpoint
DROP INDEX IF EXISTS prospects_user_created_idx;--> statement-breakpoint
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_user_id_profiles_id_fk;--> statement-breakpoint
ALTER TABLE prospects DROP COLUMN user_id;--> statement-breakpoint

DROP INDEX IF EXISTS tags_user_idx;--> statement-breakpoint
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_user_id_profiles_id_fk;--> statement-breakpoint
ALTER TABLE tags DROP COLUMN user_id;--> statement-breakpoint

DROP INDEX IF EXISTS generation_logs_user_idx;--> statement-breakpoint
DROP INDEX IF EXISTS generation_logs_user_created_idx;--> statement-breakpoint
ALTER TABLE generation_logs DROP CONSTRAINT IF EXISTS generation_logs_user_id_profiles_id_fk;--> statement-breakpoint
ALTER TABLE generation_logs DROP COLUMN user_id;--> statement-breakpoint


-- ============================================================
-- PART 6: REMOVE AGENCY FIELDS FROM profiles
-- ============================================================

ALTER TABLE profiles DROP COLUMN IF EXISTS agency_name;--> statement-breakpoint
ALTER TABLE profiles DROP COLUMN IF EXISTS sender_name;--> statement-breakpoint
ALTER TABLE profiles DROP COLUMN IF EXISTS agency_website;--> statement-breakpoint
ALTER TABLE profiles DROP COLUMN IF EXISTS agency_value_props;--> statement-breakpoint
ALTER TABLE profiles DROP COLUMN IF EXISTS agency_services;--> statement-breakpoint


-- ============================================================
-- PART 7: UPDATE handle_new_user TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_org_id uuid;
  org_name   text;
  org_slug   text;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  org_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1),
    'My Agency'
  );

  org_slug := lower(regexp_replace(org_name, '[^a-z0-9]+', '-', 'g'))
              || '-' || substr(md5(NEW.id::text), 1, 6);

  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);--> statement-breakpoint


-- ============================================================
-- PART 8: RLS ON NEW TABLES
-- ============================================================

ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;--> statement-breakpoint


-- ============================================================
-- PART 9: HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  )
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.can_write_in_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('editor', 'admin')
  )
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'admin'
  )
$$;--> statement-breakpoint


-- ============================================================
-- PART 10: DROP OLD USER-SCOPED POLICIES
-- ============================================================

DROP POLICY IF EXISTS "prospects_select_own"      ON prospects;--> statement-breakpoint
DROP POLICY IF EXISTS "prospects_insert_own"      ON prospects;--> statement-breakpoint
DROP POLICY IF EXISTS "prospects_update_own"      ON prospects;--> statement-breakpoint
DROP POLICY IF EXISTS "prospects_delete_own"      ON prospects;--> statement-breakpoint
DROP POLICY IF EXISTS "messages_select_own"       ON messages;--> statement-breakpoint
DROP POLICY IF EXISTS "messages_insert_own"       ON messages;--> statement-breakpoint
DROP POLICY IF EXISTS "messages_update_own"       ON messages;--> statement-breakpoint
DROP POLICY IF EXISTS "messages_delete_own"       ON messages;--> statement-breakpoint
DROP POLICY IF EXISTS "tags_select_own"           ON tags;--> statement-breakpoint
DROP POLICY IF EXISTS "tags_insert_own"           ON tags;--> statement-breakpoint
DROP POLICY IF EXISTS "tags_update_own"           ON tags;--> statement-breakpoint
DROP POLICY IF EXISTS "tags_delete_own"           ON tags;--> statement-breakpoint
DROP POLICY IF EXISTS "prospect_tags_select_own"  ON prospect_tags;--> statement-breakpoint
DROP POLICY IF EXISTS "prospect_tags_insert_own"  ON prospect_tags;--> statement-breakpoint
DROP POLICY IF EXISTS "prospect_tags_delete_own"  ON prospect_tags;--> statement-breakpoint
DROP POLICY IF EXISTS "generation_logs_select_own" ON generation_logs;--> statement-breakpoint
DROP POLICY IF EXISTS "generation_logs_insert_own" ON generation_logs;--> statement-breakpoint


-- ============================================================
-- PART 11: NEW ORG-SCOPED RLS POLICIES
-- ============================================================

CREATE POLICY "prospects_select" ON prospects FOR SELECT
  USING (is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "prospects_insert" ON prospects FOR INSERT
  WITH CHECK (can_write_in_org(org_id));--> statement-breakpoint
CREATE POLICY "prospects_update" ON prospects FOR UPDATE
  USING (can_write_in_org(org_id)) WITH CHECK (can_write_in_org(org_id));--> statement-breakpoint
CREATE POLICY "prospects_delete" ON prospects FOR DELETE
  USING (can_write_in_org(org_id));--> statement-breakpoint

CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (can_write_in_org(org_id));--> statement-breakpoint
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (can_write_in_org(org_id)) WITH CHECK (can_write_in_org(org_id));--> statement-breakpoint
CREATE POLICY "messages_delete" ON messages FOR DELETE
  USING (can_write_in_org(org_id));--> statement-breakpoint

CREATE POLICY "tags_select" ON tags FOR SELECT
  USING (is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (can_write_in_org(org_id));--> statement-breakpoint
CREATE POLICY "tags_update" ON tags FOR UPDATE
  USING (can_write_in_org(org_id)) WITH CHECK (can_write_in_org(org_id));--> statement-breakpoint
CREATE POLICY "tags_delete" ON tags FOR DELETE
  USING (can_write_in_org(org_id));--> statement-breakpoint

CREATE POLICY "prospect_tags_select" ON prospect_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prospects p
      WHERE p.id = prospect_id AND is_org_member(p.org_id)
    )
  );--> statement-breakpoint
CREATE POLICY "prospect_tags_insert" ON prospect_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prospects p
      WHERE p.id = prospect_id AND can_write_in_org(p.org_id)
    )
  );--> statement-breakpoint
CREATE POLICY "prospect_tags_delete" ON prospect_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM prospects p
      WHERE p.id = prospect_id AND can_write_in_org(p.org_id)
    )
  );--> statement-breakpoint

CREATE POLICY "generation_logs_select" ON generation_logs FOR SELECT
  USING (is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "generation_logs_insert" ON generation_logs FOR INSERT
  WITH CHECK (can_write_in_org(org_id));--> statement-breakpoint

CREATE POLICY "organizations_select" ON organizations FOR SELECT
  USING (is_org_member(id));--> statement-breakpoint
CREATE POLICY "organizations_insert" ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "organizations_update" ON organizations FOR UPDATE
  USING (is_org_admin(id)) WITH CHECK (is_org_admin(id));--> statement-breakpoint
CREATE POLICY "organizations_delete" ON organizations FOR DELETE
  USING (is_org_admin(id));--> statement-breakpoint

CREATE POLICY "org_members_select" ON organization_members FOR SELECT
  USING (is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "org_members_insert" ON organization_members FOR INSERT
  WITH CHECK (is_org_admin(org_id));--> statement-breakpoint
CREATE POLICY "org_members_update" ON organization_members FOR UPDATE
  USING (is_org_admin(org_id)) WITH CHECK (is_org_admin(org_id));--> statement-breakpoint
CREATE POLICY "org_members_delete" ON organization_members FOR DELETE
  USING (is_org_admin(org_id) OR user_id = auth.uid());--> statement-breakpoint

CREATE POLICY "org_invites_select" ON organization_invites FOR SELECT
  USING (is_org_admin(org_id));--> statement-breakpoint
CREATE POLICY "org_invites_insert" ON organization_invites FOR INSERT
  WITH CHECK (is_org_admin(org_id));--> statement-breakpoint
CREATE POLICY "org_invites_delete" ON organization_invites FOR DELETE
  USING (is_org_admin(org_id));--> statement-breakpoint
