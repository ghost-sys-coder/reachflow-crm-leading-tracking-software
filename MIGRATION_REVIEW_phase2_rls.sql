-- File: MIGRATION_REVIEW_phase2_rls.sql
-- Phase 2: Row Level Security rewrite for org-based multi-tenancy
-- Review this before applying. Run AFTER phase1_schema is applied.
-- ============================================================


-- ============================================================
-- PART 1: ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PART 2: HELPER FUNCTIONS
-- SECURITY DEFINER so they run as the definer and bypass RLS
-- on the organization_members table when resolving membership
-- ============================================================

-- True if the current user is a member of the given org
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
$$;

-- True if the current user has editor or admin role in the given org
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
$$;

-- True if the current user is an admin of the given org
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
$$;


-- ============================================================
-- PART 3: DROP ALL OLD USER-SCOPED POLICIES
-- ============================================================

DROP POLICY IF EXISTS "prospects_select_own"    ON prospects;
DROP POLICY IF EXISTS "prospects_insert_own"    ON prospects;
DROP POLICY IF EXISTS "prospects_update_own"    ON prospects;
DROP POLICY IF EXISTS "prospects_delete_own"    ON prospects;

DROP POLICY IF EXISTS "messages_select_own"     ON messages;
DROP POLICY IF EXISTS "messages_insert_own"     ON messages;
DROP POLICY IF EXISTS "messages_update_own"     ON messages;
DROP POLICY IF EXISTS "messages_delete_own"     ON messages;

DROP POLICY IF EXISTS "tags_select_own"         ON tags;
DROP POLICY IF EXISTS "tags_insert_own"         ON tags;
DROP POLICY IF EXISTS "tags_update_own"         ON tags;
DROP POLICY IF EXISTS "tags_delete_own"         ON tags;

DROP POLICY IF EXISTS "prospect_tags_select_own" ON prospect_tags;
DROP POLICY IF EXISTS "prospect_tags_insert_own" ON prospect_tags;
DROP POLICY IF EXISTS "prospect_tags_delete_own" ON prospect_tags;

DROP POLICY IF EXISTS "generation_logs_select_own" ON generation_logs;
DROP POLICY IF EXISTS "generation_logs_insert_own" ON generation_logs;


-- ============================================================
-- PART 4: NEW ORG-SCOPED POLICIES
-- ============================================================

-- prospects
CREATE POLICY "prospects_select" ON prospects FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "prospects_insert" ON prospects FOR INSERT
  WITH CHECK (can_write_in_org(org_id));

CREATE POLICY "prospects_update" ON prospects FOR UPDATE
  USING (can_write_in_org(org_id))
  WITH CHECK (can_write_in_org(org_id));

CREATE POLICY "prospects_delete" ON prospects FOR DELETE
  USING (can_write_in_org(org_id));


-- messages
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (can_write_in_org(org_id));

CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (can_write_in_org(org_id))
  WITH CHECK (can_write_in_org(org_id));

CREATE POLICY "messages_delete" ON messages FOR DELETE
  USING (can_write_in_org(org_id));


-- tags
CREATE POLICY "tags_select" ON tags FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (can_write_in_org(org_id));

CREATE POLICY "tags_update" ON tags FOR UPDATE
  USING (can_write_in_org(org_id))
  WITH CHECK (can_write_in_org(org_id));

CREATE POLICY "tags_delete" ON tags FOR DELETE
  USING (can_write_in_org(org_id));


-- prospect_tags: authorization derived from the parent prospect's org
CREATE POLICY "prospect_tags_select" ON prospect_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prospects p
      WHERE p.id = prospect_id AND is_org_member(p.org_id)
    )
  );

CREATE POLICY "prospect_tags_insert" ON prospect_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prospects p
      WHERE p.id = prospect_id AND can_write_in_org(p.org_id)
    )
  );

CREATE POLICY "prospect_tags_delete" ON prospect_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM prospects p
      WHERE p.id = prospect_id AND can_write_in_org(p.org_id)
    )
  );


-- generation_logs
CREATE POLICY "generation_logs_select" ON generation_logs FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "generation_logs_insert" ON generation_logs FOR INSERT
  WITH CHECK (can_write_in_org(org_id));


-- organizations: members can read, admins can update/delete
CREATE POLICY "organizations_select" ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "organizations_insert" ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_update" ON organizations FOR UPDATE
  USING (is_org_admin(id))
  WITH CHECK (is_org_admin(id));

CREATE POLICY "organizations_delete" ON organizations FOR DELETE
  USING (is_org_admin(id));


-- organization_members: members can read their org roster, admins manage it
-- a user can also remove themselves (self-removal)
CREATE POLICY "org_members_select" ON organization_members FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "org_members_insert" ON organization_members FOR INSERT
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "org_members_update" ON organization_members FOR UPDATE
  USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "org_members_delete" ON organization_members FOR DELETE
  USING (is_org_admin(org_id) OR user_id = auth.uid());


-- organization_invites: admin-only
CREATE POLICY "org_invites_select" ON organization_invites FOR SELECT
  USING (is_org_admin(org_id));

CREATE POLICY "org_invites_insert" ON organization_invites FOR INSERT
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "org_invites_delete" ON organization_invites FOR DELETE
  USING (is_org_admin(org_id));
