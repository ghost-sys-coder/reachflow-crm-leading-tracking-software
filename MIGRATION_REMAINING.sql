-- Remaining statements from 0003_multi_tenant migration
-- Apply these in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Statements 1-47 were already applied successfully.


-- updated_at trigger for organizations (replaces moddatetime dependency)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- enable RLS on new tables
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;


-- helper functions
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


-- drop old user-scoped policies
DROP POLICY IF EXISTS "prospects_select_own"       ON prospects;
DROP POLICY IF EXISTS "prospects_insert_own"       ON prospects;
DROP POLICY IF EXISTS "prospects_update_own"       ON prospects;
DROP POLICY IF EXISTS "prospects_delete_own"       ON prospects;
DROP POLICY IF EXISTS "messages_select_own"        ON messages;
DROP POLICY IF EXISTS "messages_insert_own"        ON messages;
DROP POLICY IF EXISTS "messages_update_own"        ON messages;
DROP POLICY IF EXISTS "messages_delete_own"        ON messages;
DROP POLICY IF EXISTS "tags_select_own"            ON tags;
DROP POLICY IF EXISTS "tags_insert_own"            ON tags;
DROP POLICY IF EXISTS "tags_update_own"            ON tags;
DROP POLICY IF EXISTS "tags_delete_own"            ON tags;
DROP POLICY IF EXISTS "prospect_tags_select_own"   ON prospect_tags;
DROP POLICY IF EXISTS "prospect_tags_insert_own"   ON prospect_tags;
DROP POLICY IF EXISTS "prospect_tags_delete_own"   ON prospect_tags;
DROP POLICY IF EXISTS "generation_logs_select_own" ON generation_logs;
DROP POLICY IF EXISTS "generation_logs_insert_own" ON generation_logs;


-- new org-scoped policies: prospects
CREATE POLICY "prospects_select" ON prospects FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "prospects_insert" ON prospects FOR INSERT
  WITH CHECK (can_write_in_org(org_id));
CREATE POLICY "prospects_update" ON prospects FOR UPDATE
  USING (can_write_in_org(org_id)) WITH CHECK (can_write_in_org(org_id));
CREATE POLICY "prospects_delete" ON prospects FOR DELETE
  USING (can_write_in_org(org_id));

-- messages
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (can_write_in_org(org_id));
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (can_write_in_org(org_id)) WITH CHECK (can_write_in_org(org_id));
CREATE POLICY "messages_delete" ON messages FOR DELETE
  USING (can_write_in_org(org_id));

-- tags
CREATE POLICY "tags_select" ON tags FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (can_write_in_org(org_id));
CREATE POLICY "tags_update" ON tags FOR UPDATE
  USING (can_write_in_org(org_id)) WITH CHECK (can_write_in_org(org_id));
CREATE POLICY "tags_delete" ON tags FOR DELETE
  USING (can_write_in_org(org_id));

-- prospect_tags
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

-- organizations
CREATE POLICY "organizations_select" ON organizations FOR SELECT
  USING (is_org_member(id));
CREATE POLICY "organizations_insert" ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE
  USING (is_org_admin(id)) WITH CHECK (is_org_admin(id));
CREATE POLICY "organizations_delete" ON organizations FOR DELETE
  USING (is_org_admin(id));

-- organization_members
CREATE POLICY "org_members_select" ON organization_members FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "org_members_insert" ON organization_members FOR INSERT
  WITH CHECK (is_org_admin(org_id));
CREATE POLICY "org_members_update" ON organization_members FOR UPDATE
  USING (is_org_admin(org_id)) WITH CHECK (is_org_admin(org_id));
CREATE POLICY "org_members_delete" ON organization_members FOR DELETE
  USING (is_org_admin(org_id) OR user_id = auth.uid());

-- organization_invites
CREATE POLICY "org_invites_select" ON organization_invites FOR SELECT
  USING (is_org_admin(org_id));
CREATE POLICY "org_invites_insert" ON organization_invites FOR INSERT
  WITH CHECK (is_org_admin(org_id));
CREATE POLICY "org_invites_delete" ON organization_invites FOR DELETE
  USING (is_org_admin(org_id));
