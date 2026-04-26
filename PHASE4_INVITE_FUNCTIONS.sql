-- Phase 4: Invite helper functions
-- Apply in Supabase Dashboard → SQL Editor → New query
-- These bypass RLS so invite links work before the recipient is a member.

-- 1. Look up a non-expired invite by token (safe public read)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
RETURNS TABLE (
  id         uuid,
  org_id     uuid,
  email      text,
  role       text,
  expires_at timestamptz,
  org_name   text
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
$$;

-- 2. Accept an invite (requires the caller to be authenticated via auth.uid())
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
  WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  -- Add user as a member (ON CONFLICT keeps existing role intact)
  INSERT INTO public.organization_members (org_id, user_id, role, invited_by)
  VALUES (v_invite.org_id, auth.uid(), v_invite.role, v_invite.created_by)
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- Consume the invite
  DELETE FROM public.organization_invites WHERE id = v_invite.id;
END;
$$;
