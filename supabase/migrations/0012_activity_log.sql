CREATE TABLE public.activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id  uuid        NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name   text        NOT NULL DEFAULT 'Team member',
  action       text        NOT NULL,
  old_value    text,
  new_value    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_action_valid
    CHECK (action IN (
      'prospect_created',
      'status_changed',
      'assignee_changed',
      'note_updated',
      'prospect_updated',
      'message_saved',
      'outreach_sent'
    ))
);--> statement-breakpoint

CREATE INDEX activity_log_prospect_idx ON public.activity_log(prospect_id);--> statement-breakpoint
CREATE INDEX activity_log_org_idx      ON public.activity_log(org_id);--> statement-breakpoint

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Any org member can read the activity log for their org
CREATE POLICY "activity_log_select" ON public.activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = activity_log.org_id
        AND user_id = auth.uid()
    )
  );--> statement-breakpoint
