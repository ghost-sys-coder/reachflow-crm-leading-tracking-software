-- ReachFlow seed helper.
--
-- Idempotent: inserting a second time for the same user is a no-op
-- because the function short-circuits when prospects already exist.
--
-- Apply the file once (Dashboard SQL editor) to create the function,
-- then call it with your own auth.uid() after signing in via the app:
--
--   SELECT public.seed_reachflow_for(auth.uid());

CREATE OR REPLACE FUNCTION public.seed_reachflow_for(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tag_warm uuid;
  tag_followup uuid;
  tag_hot uuid;
  prospect_sam uuid;
BEGIN
  --ensure a profiles row exists. Users that signed up before the
  --handle_new_user trigger was installed will not have one yet.
  INSERT INTO public.profiles (id, full_name)
  SELECT p_user, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
  FROM auth.users u
  WHERE u.id = p_user
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.prospects WHERE user_id = p_user) THEN
    RAISE NOTICE 'User % already has prospects. Skipping seed.', p_user;
    RETURN;
  END IF;

  INSERT INTO public.tags (user_id, name, color) VALUES
    (p_user, 'Warm lead', 'amber'),
    (p_user, 'Follow up', 'blue'),
    (p_user, 'Hot', 'red')
  ON CONFLICT (user_id, name) DO NOTHING;

  SELECT id INTO tag_warm FROM public.tags WHERE user_id = p_user AND name = 'Warm lead';
  SELECT id INTO tag_followup FROM public.tags WHERE user_id = p_user AND name = 'Follow up';
  SELECT id INTO tag_hot FROM public.tags WHERE user_id = p_user AND name = 'Hot';

  INSERT INTO public.prospects
    (user_id, business_name, platform, handle, industry, location, status, notes, last_contacted_at)
  VALUES
    (p_user, 'Sam''s Plumbing', 'instagram', '@samsplumbing', 'Trades', 'Tucson, AZ',
      'replied', 'Open to review automation. Warm lead.', now() - interval '2 days')
  RETURNING id INTO prospect_sam;

  INSERT INTO public.prospects
    (user_id, business_name, platform, handle, industry, location, status, notes, last_contacted_at)
  VALUES
    (p_user, 'Blue Bench Coffee', 'email', 'hello@bluebench.cafe', 'Food & beverage',
      'Portland, OR', 'sent', 'Cold email sent Monday.', now() - interval '1 day'),
    (p_user, 'North Harbor Dental', 'email', 'ops@northharbor.dental', 'Healthcare',
      'Seattle, WA', 'waiting', 'Asked for pricing sheet.', now() - interval '4 days'),
    (p_user, 'Mason Street Gym', 'linkedin', 'linkedin.com/in/mason-street', 'Fitness',
      'Austin, TX', 'booked', 'Call booked for next Thursday.', now() - interval '3 days'),
    (p_user, 'Calder & Co. Roofing', 'instagram', '@calderroofing', 'Trades',
      'Denver, CO', 'sent', NULL, now() - interval '1 day'),
    (p_user, 'Rose & Vine Florist', 'instagram', '@roseandvine', 'Retail',
      'Chicago, IL', 'dead', 'Ignored 2 follow-ups.', now() - interval '21 days'),
    (p_user, 'Pinehill Landscaping', 'facebook', 'facebook.com/pinehill', 'Trades',
      'Raleigh, NC', 'replied', 'Asked for info in the spring.', now() - interval '6 days'),
    (p_user, 'Orbital Accounting', 'linkedin', 'linkedin.com/in/orbital', 'Professional services',
      'Toronto, ON', 'closed', 'Signed October 2025.', now() - interval '30 days'),
    (p_user, 'West Basin Yoga', 'instagram', '@westbasin', 'Fitness',
      'San Diego, CA', 'sent', NULL, now() - interval '2 hours'),
    (p_user, 'Harper Veterinary', 'email', 'contact@harpervet.com', 'Healthcare',
      'Boulder, CO', 'waiting', 'Follow-up scheduled for Monday.', now() - interval '5 days');

  IF prospect_sam IS NOT NULL AND tag_warm IS NOT NULL THEN
    INSERT INTO public.prospect_tags (prospect_id, tag_id)
    VALUES (prospect_sam, tag_warm);
  END IF;

  IF prospect_sam IS NOT NULL THEN
    INSERT INTO public.messages
      (prospect_id, user_id, message_type, content, was_sent, sent_at)
    VALUES (
      prospect_sam,
      p_user,
      'instagram_dm',
      'Hey Sam, noticed Sam''s Plumbing has 12 Google reviews after 8 years in Tucson. ' ||
      'Most local plumbers sit around 40. I run a small agency that helps trades pull ' ||
      '20+ reviews in 30 days using a 3-text flow. Want me to send over the playbook?',
      true,
      now() - interval '2 days'
    );
  END IF;

  RAISE NOTICE 'Seeded ReachFlow data for user %', p_user;
END;
$$;
