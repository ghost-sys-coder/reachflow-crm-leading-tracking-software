CREATE TABLE public.roadmap_feature_progress (
  feature_key text PRIMARY KEY,
  is_completed boolean NOT NULL DEFAULT false,
  implementation_notes text NOT NULL DEFAULT '',
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_by_email text,
  notes_updated_at timestamptz,
  notes_updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes_updated_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roadmap_feature_key_not_blank CHECK (length(trim(feature_key)) > 0),
  CONSTRAINT roadmap_completion_consistent CHECK (
    (is_completed = true AND completed_at IS NOT NULL AND completed_by IS NOT NULL)
    OR
    (is_completed = false AND completed_at IS NULL AND completed_by IS NULL)
  )
);

CREATE INDEX roadmap_feature_progress_completed_idx
  ON public.roadmap_feature_progress (is_completed);

ALTER TABLE public.roadmap_feature_progress ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.roadmap_feature_progress TO authenticated;

CREATE POLICY "roadmap_allowlisted_select"
  ON public.roadmap_feature_progress
  FOR SELECT
  TO authenticated
  USING (
    lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
      IN ('franktamalejr@gmail.com', 'juniorbeast177@gmail.com')
  );

CREATE POLICY "roadmap_allowlisted_insert"
  ON public.roadmap_feature_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
      IN ('franktamalejr@gmail.com', 'juniorbeast177@gmail.com')
  );

CREATE POLICY "roadmap_allowlisted_update"
  ON public.roadmap_feature_progress
  FOR UPDATE
  TO authenticated
  USING (
    lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
      IN ('franktamalejr@gmail.com', 'juniorbeast177@gmail.com')
  )
  WITH CHECK (
    lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
      IN ('franktamalejr@gmail.com', 'juniorbeast177@gmail.com')
  );

INSERT INTO public.roadmap_feature_progress (feature_key)
VALUES
  ('call_outcomes'),
  ('reply_objection_tracking'),
  ('follow_up_command_center'),
  ('saved_views_smart_lists'),
  ('tasks_team_handoffs'),
  ('custom_prospect_fields'),
  ('import_history_rollback'),
  ('deals_revenue_tracking'),
  ('lead_source_attribution'),
  ('lead_scoring'),
  ('usage_metering_plan_limits'),
  ('data_retention_consent'),
  ('duplicate_detection_merging'),
  ('automation_rules'),
  ('client_reporting_portal'),
  ('webhook_delivery_center'),
  ('outgoing_automation_webhooks'),
  ('lead_ingestion_foundation'),
  ('forms_native_lead_sources'),
  ('calendar_integration'),
  ('connected_email'),
  ('pesapal_billing')
ON CONFLICT (feature_key) DO NOTHING;
