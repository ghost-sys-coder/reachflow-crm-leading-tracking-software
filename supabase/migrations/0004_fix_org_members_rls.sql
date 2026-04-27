-- Fix RLS on organization_members
--
-- SELECT: simple column check avoids the infinite recursion that fired when
--         the previous policy called is_org_member(), which itself queried
--         this table. Each user sees only their own row; SECURITY DEFINER
--         RPCs (get_org_members_with_profiles, is_org_member, etc.) run as
--         postgres and bypass RLS to read all rows.
--
-- UPDATE/DELETE: subquery reads the current user's OWN row (allowed by the
--         SELECT policy) to verify admin status — no recursion.
--
-- INSERT: deliberately omitted. Inserts happen only through SECURITY DEFINER
--         functions (handle_new_user trigger, accept_org_invite) which bypass
--         RLS, so no client-side INSERT policy is needed or wanted.

DROP POLICY IF EXISTS "org_members_select" ON organization_members;--> statement-breakpoint
DROP POLICY IF EXISTS "org_members_insert" ON organization_members;--> statement-breakpoint
DROP POLICY IF EXISTS "org_members_update" ON organization_members;--> statement-breakpoint
DROP POLICY IF EXISTS "org_members_delete" ON organization_members;--> statement-breakpoint

CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (user_id = auth.uid());--> statement-breakpoint

CREATE POLICY "org_members_update" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members self
      WHERE self.org_id = organization_members.org_id
        AND self.user_id = auth.uid()
        AND self.role = 'admin'
    )
  );--> statement-breakpoint

CREATE POLICY "org_members_delete" ON organization_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members self
      WHERE self.org_id = organization_members.org_id
        AND self.user_id = auth.uid()
        AND self.role = 'admin'
    )
  );--> statement-breakpoint
