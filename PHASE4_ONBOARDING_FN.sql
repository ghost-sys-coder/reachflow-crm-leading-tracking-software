-- Phase 4: Onboarding helper + idempotent new-user trigger.
-- Apply in Supabase Dashboard → SQL Editor → New query → Run
--
-- Why SECURITY DEFINER here specifically:
--   Bootstrapping the very first organization_members row for a user
--   cannot satisfy the "must already be an admin of the org" INSERT policy
--   because no such row exists yet. This is the same reason the
--   handle_new_user trigger is SECURITY DEFINER. All other RLS policies
--   use plain EXISTS checks and do NOT call SECURITY DEFINER helpers.


-- ============================================================
-- 1. Idempotent handle_new_user trigger
--    The original version used hard INSERTs that would raise on
--    conflict if the trigger somehow fired twice (e.g. OAuth
--    provider retry). ON CONFLICT DO NOTHING + an existence guard
--    make it safe to call any number of times.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id  uuid;
  v_name    text;
  v_slug    text;
BEGIN
  -- Profile: safe to call multiple times
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Org + membership: only if this user has no org yet
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members WHERE user_id = NEW.id
  ) THEN
    v_name := COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      split_part(NEW.email, '@', 1),
      'My Agency'
    );

    v_slug := lower(regexp_replace(v_name, '[^a-z0-9]+', '-', 'g'))
              || '-' || substr(md5(NEW.id::text), 1, 6);

    INSERT INTO public.organizations (name, slug)
    VALUES (v_name, v_slug)
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (v_org_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- 2. complete_user_onboarding — self-healing RPC
--    Normal path: finds the user's existing org via
--    organization_members and updates it.
--    Recovery path: if the new-user trigger never ran (silent
--    failure during OAuth / email confirmation), creates the
--    org and membership on the spot so onboarding can complete.
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  p_agency_name text,
  p_sender_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org_id uuid;
  v_org    public.organizations%ROWTYPE;
  v_slug   text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Normal path: user already has an org from the sign-up trigger
  SELECT org_id INTO v_org_id
  FROM public.organization_members
  WHERE user_id = v_uid
  ORDER BY created_at
  LIMIT 1;

  -- Recovery path: trigger failed silently — bootstrap now
  IF v_org_id IS NULL THEN
    INSERT INTO public.profiles (id, full_name)
    VALUES (v_uid, p_sender_name)
    ON CONFLICT (id) DO NOTHING;

    -- Use a short hash slug to guarantee uniqueness
    v_slug := 'org-' || substr(md5(v_uid::text), 1, 12);

    INSERT INTO public.organizations (name, slug)
    VALUES (
      COALESCE(NULLIF(TRIM(p_agency_name), ''), 'My Agency'),
      v_slug
    )
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (v_org_id, v_uid, 'admin');
  END IF;

  -- Update org with the agency details supplied during onboarding
  UPDATE public.organizations
  SET
    name        = p_agency_name,
    agency_name = p_agency_name,
    sender_name = p_sender_name,
    updated_at  = now()
  WHERE id = v_org_id
  RETURNING * INTO v_org;

  RETURN row_to_json(v_org);
END;
$$;
