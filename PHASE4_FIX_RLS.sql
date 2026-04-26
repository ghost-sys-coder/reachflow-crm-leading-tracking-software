-- Phase 4: Replace all SECURITY DEFINER helper function calls from
-- RLS policy expressions with direct auth.uid() checks and plain
-- EXISTS subqueries. This eliminates the self-referential evaluation
-- on organization_members and lets the app query that table directly.
--
-- Apply in Supabase Dashboard → SQL Editor → New query → Run

-- ============================================================
-- DROP OLD POLICIES
-- ============================================================

DROP POLICY IF EXISTS "org_members_select"        ON organization_members;
DROP POLICY IF EXISTS "org_members_insert"        ON organization_members;
DROP POLICY IF EXISTS "org_members_update"        ON organization_members;
DROP POLICY IF EXISTS "org_members_delete"        ON organization_members;

DROP POLICY IF EXISTS "organizations_select"      ON organizations;
DROP POLICY IF EXISTS "organizations_insert"      ON organizations;
DROP POLICY IF EXISTS "organizations_update"      ON organizations;
DROP POLICY IF EXISTS "organizations_delete"      ON organizations;

DROP POLICY IF EXISTS "org_invites_select"        ON organization_invites;
DROP POLICY IF EXISTS "org_invites_insert"        ON organization_invites;
DROP POLICY IF EXISTS "org_invites_delete"        ON organization_invites;

DROP POLICY IF EXISTS "prospects_select"          ON prospects;
DROP POLICY IF EXISTS "prospects_insert"          ON prospects;
DROP POLICY IF EXISTS "prospects_update"          ON prospects;
DROP POLICY IF EXISTS "prospects_delete"          ON prospects;

DROP POLICY IF EXISTS "messages_select"           ON messages;
DROP POLICY IF EXISTS "messages_insert"           ON messages;
DROP POLICY IF EXISTS "messages_update"           ON messages;
DROP POLICY IF EXISTS "messages_delete"           ON messages;

DROP POLICY IF EXISTS "tags_select"               ON tags;
DROP POLICY IF EXISTS "tags_insert"               ON tags;
DROP POLICY IF EXISTS "tags_update"               ON tags;
DROP POLICY IF EXISTS "tags_delete"               ON tags;

DROP POLICY IF EXISTS "prospect_tags_select"      ON prospect_tags;
DROP POLICY IF EXISTS "prospect_tags_insert"      ON prospect_tags;
DROP POLICY IF EXISTS "prospect_tags_delete"      ON prospect_tags;

DROP POLICY IF EXISTS "generation_logs_select"    ON generation_logs;
DROP POLICY IF EXISTS "generation_logs_insert"    ON generation_logs;


-- ============================================================
-- REUSABLE INLINE HELPERS (views, not functions)
-- We avoid calling SECURITY DEFINER functions from USING/WITH CHECK.
-- All membership checks use plain EXISTS against organization_members.
-- ============================================================


-- ============================================================
-- organization_members
--
-- Two SELECT policies (OR'd by Postgres):
--   1. Own row: user can always read their own membership (zero extra queries)
--   2. Peers:   user can read all members in their orgs — the subquery is
--               evaluated under RLS so it only finds the caller's own row,
--               which satisfies policy 1, breaking any potential recursion.
-- ============================================================

CREATE POLICY "org_members_select_own"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "org_members_select_peers"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = organization_members.org_id
        AND m.user_id = auth.uid()
    )
  );

-- The handle_new_user trigger (SECURITY DEFINER) inserts the first admin row
-- for new users, so it never hits this policy. Subsequent inserts (invites)
-- go through the SECURITY DEFINER accept_org_invite RPC — also unaffected.
-- This policy gates any direct app-level insert attempts.
CREATE POLICY "org_members_insert"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organization_members.org_id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  );

CREATE POLICY "org_members_update"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organization_members.org_id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organization_members.org_id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  );

-- Members can remove themselves; admins can remove anyone.
CREATE POLICY "org_members_delete"
  ON organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organization_members.org_id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  );


-- ============================================================
-- organizations
-- ============================================================

CREATE POLICY "organizations_select"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organizations.id
        AND user_id = auth.uid()
    )
  );

-- The handle_new_user trigger creates the org row (SECURITY DEFINER).
-- This INSERT policy is a safety net for authenticated users only.
CREATE POLICY "organizations_insert"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_update"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organizations.id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organizations.id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  );

CREATE POLICY "organizations_delete"
  ON organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organizations.id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  );


-- ============================================================
-- organization_invites (admin-only)
-- ============================================================

CREATE POLICY "org_invites_select"
  ON organization_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organization_invites.org_id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  );

CREATE POLICY "org_invites_insert"
  ON organization_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organization_invites.org_id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  );

CREATE POLICY "org_invites_delete"
  ON organization_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = organization_invites.org_id
        AND user_id = auth.uid()
        AND role    = 'admin'
    )
  );


-- ============================================================
-- prospects (viewers read; editors/admins write)
-- ============================================================

CREATE POLICY "prospects_select"
  ON prospects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = prospects.org_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "prospects_insert"
  ON prospects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = prospects.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "prospects_update"
  ON prospects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = prospects.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = prospects.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "prospects_delete"
  ON prospects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = prospects.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );


-- ============================================================
-- messages
-- ============================================================

CREATE POLICY "messages_select"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = messages.org_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = messages.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "messages_update"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = messages.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = messages.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "messages_delete"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = messages.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );


-- ============================================================
-- tags
-- ============================================================

CREATE POLICY "tags_select"
  ON tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = tags.org_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "tags_insert"
  ON tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = tags.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "tags_update"
  ON tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = tags.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = tags.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "tags_delete"
  ON tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = tags.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );


-- ============================================================
-- prospect_tags (join table — derive org via prospect)
-- ============================================================

CREATE POLICY "prospect_tags_select"
  ON prospect_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.prospects          p
      JOIN   public.organization_members om
             ON  om.org_id  = p.org_id
             AND om.user_id = auth.uid()
      WHERE  p.id = prospect_tags.prospect_id
    )
  );

CREATE POLICY "prospect_tags_insert"
  ON prospect_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.prospects          p
      JOIN   public.organization_members om
             ON  om.org_id  = p.org_id
             AND om.user_id = auth.uid()
             AND om.role    IN ('editor', 'admin')
      WHERE  p.id = prospect_tags.prospect_id
    )
  );

CREATE POLICY "prospect_tags_delete"
  ON prospect_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   public.prospects          p
      JOIN   public.organization_members om
             ON  om.org_id  = p.org_id
             AND om.user_id = auth.uid()
             AND om.role    IN ('editor', 'admin')
      WHERE  p.id = prospect_tags.prospect_id
    )
  );


-- ============================================================
-- generation_logs
-- ============================================================

CREATE POLICY "generation_logs_select"
  ON generation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = generation_logs.org_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "generation_logs_insert"
  ON generation_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id  = generation_logs.org_id
        AND user_id = auth.uid()
        AND role    IN ('editor', 'admin')
    )
  );


-- ============================================================
-- OPTIONAL CLEANUP
-- The helper functions (is_org_member, can_write_in_org, is_org_admin)
-- are no longer called from any RLS policy. They can safely remain for
-- use by the invite RPC functions (accept_org_invite etc.), or be
-- dropped if you prefer a clean slate:
--
-- DROP FUNCTION IF EXISTS public.is_org_member(uuid);
-- DROP FUNCTION IF EXISTS public.can_write_in_org(uuid);
-- DROP FUNCTION IF EXISTS public.is_org_admin(uuid);
-- ============================================================
