-- Team management RPC functions
--
-- get_invite_by_token: lets anyone holding the token read invite details
-- (bypasses admin-only RLS on organization_invites)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
RETURNS TABLE (
  id          uuid,
  org_id      uuid,
  email       text,
  role        text,
  expires_at  timestamptz,
  org_name    text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    i.id,
    i.org_id,
    i.email,
    i.role,
    i.expires_at,
    o.name AS org_name
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token = p_token
    AND i.expires_at > now()
  LIMIT 1
$$;--> statement-breakpoint

-- accept_org_invite: lets an authenticated user join an org via invite token
-- must be SECURITY DEFINER because the joining user is not yet an admin
--
-- also removes any empty personal org auto-created by handle_new_user so that
-- the invited org becomes the user's primary workspace in getAuthedOrgClient
CREATE OR REPLACE FUNCTION public.accept_org_invite(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.organization_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.organization_invites
  WHERE token = p_token
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or expired';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = v_invite.org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are already a member of this organisation';
  END IF;

  -- Ensure a profile row exists for this user.
  -- The handle_new_user trigger normally creates it, but this guards against
  -- the window between auth.users INSERT and the trigger committing, and any
  -- other edge case where the profile row was not yet written.
  INSERT INTO public.profiles (id, full_name)
  SELECT auth.uid(), u.email::text
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING;

  -- Delete any empty personal org auto-created by the sign-up trigger so the
  -- invited org becomes this user's primary workspace.
  -- Only removes orgs where: this user is the sole admin, no agency_name has
  -- been set, and no prospects exist.
  DELETE FROM public.organizations
  WHERE id IN (
    SELECT om.org_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
      AND om.org_id != v_invite.org_id
  )
  AND agency_name IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.prospects WHERE prospects.org_id = organizations.id
  )
  AND 1 = (
    SELECT COUNT(*)
    FROM public.organization_members
    WHERE organization_members.org_id = organizations.id
  );

  -- Add the user as a member of the invited org
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_invite.org_id, auth.uid(), v_invite.role);

  -- Consume the invite
  DELETE FROM public.organization_invites WHERE id = v_invite.id;
END;
$$;--> statement-breakpoint

-- get_org_members_with_profiles: returns all members of an org with name + email
-- must be SECURITY DEFINER to bypass the user_id = auth.uid() SELECT policy
-- and to read auth.users for email addresses
CREATE OR REPLACE FUNCTION public.get_org_members_with_profiles(p_org_id uuid)
RETURNS TABLE (
  id          uuid,
  org_id      uuid,
  user_id     uuid,
  role        text,
  invited_by  uuid,
  created_at  timestamptz,
  full_name   text,
  email       text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    om.id,
    om.org_id,
    om.user_id,
    om.role,
    om.invited_by,
    om.created_at,
    p.full_name,
    u.email::text
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.user_id
  JOIN auth.users u ON u.id = om.user_id
  WHERE om.org_id = p_org_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members cm
      WHERE cm.org_id = p_org_id AND cm.user_id = auth.uid()
    )
  ORDER BY om.created_at ASC
$$;--> statement-breakpoint
