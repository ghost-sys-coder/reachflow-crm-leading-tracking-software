-- File: MIGRATION_REVIEW_phase1_schema.sql
-- Phase 1: Multi-tenant schema migration
-- Review this before applying. Apply via Supabase SQL editor after approval.
-- ============================================================


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
);

CREATE TABLE organization_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer',
  invited_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id),
  CONSTRAINT org_members_role_valid CHECK (role IN ('admin', 'editor', 'viewer'))
);

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
);


-- ============================================================
-- PART 2: ADD org_id COLUMNS TO EXISTING TABLES
-- ============================================================

ALTER TABLE prospects       ADD COLUMN org_id uuid;
ALTER TABLE messages        ADD COLUMN org_id uuid;
ALTER TABLE tags            ADD COLUMN org_id uuid;
ALTER TABLE generation_logs ADD COLUMN org_id uuid;


-- ============================================================
-- PART 3: DATA MIGRATION
-- ============================================================

-- Temporary mapping: profile_id → new org_id
CREATE TEMP TABLE profile_org_map (
  profile_id uuid NOT NULL,
  org_id     uuid NOT NULL
);

INSERT INTO profile_org_map (profile_id, org_id)
SELECT id, gen_random_uuid() FROM profiles;

-- Create one organization per existing user
INSERT INTO organizations (
  id, name, slug,
  agency_name, sender_name, agency_website, agency_value_props, agency_services
)
SELECT
  m.org_id,
  COALESCE(NULLIF(TRIM(p.agency_name), ''), p.full_name, 'My Agency'),
  lower(regexp_replace(
    COALESCE(NULLIF(TRIM(p.agency_name), ''), p.full_name, 'agency'),
    '[^a-z0-9]+', '-', 'g'
  )) || '-' || substr(md5(p.id::text), 1, 6),
  p.agency_name,
  p.sender_name,
  p.agency_website,
  p.agency_value_props,
  p.agency_services
FROM profiles p
JOIN profile_org_map m ON m.profile_id = p.id;

-- Add every existing user as admin of their new org
INSERT INTO organization_members (org_id, user_id, role)
SELECT m.org_id, m.profile_id, 'admin'
FROM profile_org_map m;

-- Backfill org_id on all existing data rows
UPDATE prospects
SET org_id = m.org_id
FROM profile_org_map m
WHERE prospects.user_id = m.profile_id;

UPDATE messages
SET org_id = m.org_id
FROM profile_org_map m
WHERE messages.user_id = m.profile_id;

UPDATE tags
SET org_id = m.org_id
FROM profile_org_map m
WHERE tags.user_id = m.profile_id;

UPDATE generation_logs
SET org_id = m.org_id
FROM profile_org_map m
WHERE generation_logs.user_id = m.profile_id;


-- ============================================================
-- PART 4: ENFORCE NOT NULL, ADD FOREIGN KEYS AND INDEXES
-- ============================================================

ALTER TABLE prospects       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE messages        ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE tags            ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE generation_logs ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE prospects ADD CONSTRAINT prospects_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE messages ADD CONSTRAINT messages_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE tags ADD CONSTRAINT tags_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE generation_logs ADD CONSTRAINT generation_logs_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Tag name uniqueness is now per-org, not per-user
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_user_name_uq;
ALTER TABLE tags ADD CONSTRAINT tags_org_name_uq UNIQUE (org_id, name);

-- org_id indexes replace user_id indexes on data tables
CREATE INDEX prospects_org_idx        ON prospects (org_id);
CREATE INDEX prospects_org_status_idx ON prospects (org_id, status);
CREATE INDEX prospects_org_created_idx ON prospects (org_id, created_at);
CREATE INDEX messages_org_idx         ON messages (org_id);
CREATE INDEX tags_org_idx             ON tags (org_id);
CREATE INDEX generation_logs_org_idx  ON generation_logs (org_id);
CREATE INDEX generation_logs_org_created_idx ON generation_logs (org_id, created_at);
CREATE INDEX org_members_org_idx      ON organization_members (org_id);
CREATE INDEX org_members_user_idx     ON organization_members (user_id);
CREATE INDEX org_invites_org_idx      ON organization_invites (org_id);
CREATE INDEX org_invites_token_idx    ON organization_invites (token);


-- ============================================================
-- PART 5: DROP user_id FROM NON-MESSAGE TABLES
-- messages keeps user_id for authorship tracking
-- ============================================================

DROP INDEX IF EXISTS prospects_user_idx;
DROP INDEX IF EXISTS prospects_user_status_idx;
DROP INDEX IF EXISTS prospects_user_created_idx;
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_user_id_profiles_id_fk;
ALTER TABLE prospects DROP COLUMN user_id;

DROP INDEX IF EXISTS tags_user_idx;
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_user_id_profiles_id_fk;
ALTER TABLE tags DROP COLUMN user_id;

DROP INDEX IF EXISTS generation_logs_user_idx;
DROP INDEX IF EXISTS generation_logs_user_created_idx;
ALTER TABLE generation_logs DROP CONSTRAINT IF EXISTS generation_logs_user_id_profiles_id_fk;
ALTER TABLE generation_logs DROP COLUMN user_id;


-- ============================================================
-- PART 6: REMOVE AGENCY FIELDS FROM profiles
-- These now live on organizations
-- ============================================================

ALTER TABLE profiles DROP COLUMN IF EXISTS agency_name;
ALTER TABLE profiles DROP COLUMN IF EXISTS sender_name;
ALTER TABLE profiles DROP COLUMN IF EXISTS agency_website;
ALTER TABLE profiles DROP COLUMN IF EXISTS agency_value_props;
ALTER TABLE profiles DROP COLUMN IF EXISTS agency_services;


-- ============================================================
-- PART 7: UPDATE handle_new_user TRIGGER
-- New users automatically get a personal org + admin membership
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
$$;


-- ============================================================
-- PART 8: moddatetime TRIGGER FOR organizations
-- ============================================================

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
