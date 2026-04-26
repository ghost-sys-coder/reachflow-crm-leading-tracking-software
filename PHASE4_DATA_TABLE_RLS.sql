-- Phase 4: RLS policies for all data tables.
-- Prerequisite: PHASE4_FIX_RLS.sql must be applied first so that
-- organization_members has the non-circular policies that these policies depend on.
--
-- Design rules:
--   1. No SECURITY DEFINER function calls in any USING / WITH CHECK expression.
--   2. All membership checks are plain EXISTS subqueries against organization_members.
--      RLS on that table (user_id = auth.uid()) makes those subqueries safe and non-recursive.
--   3. Role tiers:
--        viewer  — read-only across all data tables
--        editor  — read + write (insert / update / delete)
--        admin   — all of editor, plus org management
--
-- Apply in Supabase Dashboard → SQL Editor → New query → Run

-- ============================================================
-- profiles
--
-- Profiles are personal (no org_id). Two SELECT policies:
--   1. Own row — read your own profile (for /settings)
--   2. Peers   — read profiles of users who share an org with you
--                (needed to render message author names, invited-by labels, etc.)
--
-- UPDATE is intentionally own-row only: nobody else should edit your profile.
-- INSERT is a safety net; the handle_new_user trigger does the real insert.
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_select_peers" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;

-- You can always read your own profile.
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Org members can read the profiles of other members in shared orgs.
-- The self-join works because org_members_select_own lets each side of
-- the join see its own row (om_viewer where user_id = auth.uid()),
-- and org_members_select_peers lets the viewer side see om_subject rows.
CREATE POLICY "profiles_select_peers"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.organization_members om_subject
      JOIN   public.organization_members om_viewer
             ON  om_viewer.org_id = om_subject.org_id
             AND om_viewer.user_id = auth.uid()
      WHERE  om_subject.user_id = profiles.id
    )
  );

-- Defensive: handle_new_user trigger inserts the row; this only fires
-- if a client somehow tries to insert directly.
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update only their own profile (theme, full_name, etc.).
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING    (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ============================================================
-- prospects
--
-- org_id is the only scope key (user_id was removed in the multi-tenant
-- migration). Viewers can read; editors and admins can write.
-- ============================================================

DROP POLICY IF EXISTS "prospects_select" ON prospects;
DROP POLICY IF EXISTS "prospects_insert" ON prospects;
DROP POLICY IF EXISTS "prospects_update" ON prospects;
DROP POLICY IF EXISTS "prospects_delete" ON prospects;

CREATE POLICY "prospects_select"
  ON prospects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = prospects.org_id
        AND  user_id = auth.uid()
    )
  );

CREATE POLICY "prospects_insert"
  ON prospects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = prospects.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "prospects_update"
  ON prospects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = prospects.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = prospects.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "prospects_delete"
  ON prospects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = prospects.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );


-- ============================================================
-- messages
--
-- Has both org_id (org scope) and user_id (authorship tracking).
-- Access is controlled entirely by org membership, not authorship —
-- all org members should be able to see all messages for collaboration.
-- Editors/admins write; viewers read.
-- ============================================================

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_select"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = messages.org_id
        AND  user_id = auth.uid()
    )
  );

-- Inserted user_id must match the caller to prevent impersonation.
CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = messages.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );

-- Any org editor/admin can update messages (e.g. mark sent, edit drafts).
CREATE POLICY "messages_update"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = messages.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = messages.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "messages_delete"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = messages.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );


-- ============================================================
-- tags
--
-- org_id is the scope key (user_id removed in multi-tenant migration).
-- Viewers read; editors/admins write.
-- ============================================================

DROP POLICY IF EXISTS "tags_select" ON tags;
DROP POLICY IF EXISTS "tags_insert" ON tags;
DROP POLICY IF EXISTS "tags_update" ON tags;
DROP POLICY IF EXISTS "tags_delete" ON tags;

CREATE POLICY "tags_select"
  ON tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = tags.org_id
        AND  user_id = auth.uid()
    )
  );

CREATE POLICY "tags_insert"
  ON tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = tags.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "tags_update"
  ON tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = tags.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = tags.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );

CREATE POLICY "tags_delete"
  ON tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = tags.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );


-- ============================================================
-- prospect_tags
--
-- Join table with no org_id column. Org is derived through the
-- parent prospect row. The JOIN avoids a correlated subquery-
-- within-subquery and lets the planner use the FK index on
-- organization_members(org_id, user_id).
-- ============================================================

DROP POLICY IF EXISTS "prospect_tags_select" ON prospect_tags;
DROP POLICY IF EXISTS "prospect_tags_insert" ON prospect_tags;
DROP POLICY IF EXISTS "prospect_tags_delete" ON prospect_tags;

CREATE POLICY "prospect_tags_select"
  ON prospect_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.prospects           p
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
      FROM   public.prospects           p
      JOIN   public.organization_members om
             ON  om.org_id  = p.org_id
             AND om.user_id = auth.uid()
             AND om.role    IN ('editor', 'admin')
      WHERE  p.id = prospect_tags.prospect_id
    )
  );

-- No UPDATE policy: the row is a composite primary key (prospect_id, tag_id);
-- edits are modelled as delete + re-insert.

CREATE POLICY "prospect_tags_delete"
  ON prospect_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   public.prospects           p
      JOIN   public.organization_members om
             ON  om.org_id  = p.org_id
             AND om.user_id = auth.uid()
             AND om.role    IN ('editor', 'admin')
      WHERE  p.id = prospect_tags.prospect_id
    )
  );


-- ============================================================
-- generation_logs
--
-- Append-only audit log. org_id is the scope key.
-- All org members can read logs (cost visibility for the team).
-- Only editors/admins can insert (they're the ones generating messages).
-- No UPDATE or DELETE — logs are immutable once written.
-- ============================================================

DROP POLICY IF EXISTS "generation_logs_select_own" ON generation_logs;
DROP POLICY IF EXISTS "generation_logs_insert_own" ON generation_logs;
DROP POLICY IF EXISTS "generation_logs_select"     ON generation_logs;
DROP POLICY IF EXISTS "generation_logs_insert"     ON generation_logs;

CREATE POLICY "generation_logs_select"
  ON generation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = generation_logs.org_id
        AND  user_id = auth.uid()
    )
  );

CREATE POLICY "generation_logs_insert"
  ON generation_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE  org_id  = generation_logs.org_id
        AND  user_id = auth.uid()
        AND  role    IN ('editor', 'admin')
    )
  );
