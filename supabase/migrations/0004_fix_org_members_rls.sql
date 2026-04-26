-- Fix: infinite recursion in organization_members SELECT policy
--
-- The original policy called is_org_member(org_id), which itself queries
-- organization_members. PostgreSQL's recursion guard fires before the
-- SECURITY DEFINER role-switch takes effect, causing the error:
--   "infinite recursion detected in policy for relation organization_members"
--
-- Fix: replace the SELECT policy with a direct column check.
-- Users can select any row where they are the member.
-- The helper functions (is_org_member, is_org_admin, can_write_in_org) already
-- filter by user_id = auth.uid(), so they continue to work correctly under
-- this policy without any additional recursion risk.

DROP POLICY IF EXISTS "org_members_select" ON organization_members;--> statement-breakpoint

CREATE POLICY "org_members_select" ON organization_members FOR SELECT
  USING (user_id = auth.uid());--> statement-breakpoint
