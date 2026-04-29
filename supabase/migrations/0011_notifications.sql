CREATE TABLE public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  type        text        NOT NULL,
  subject_id  uuid,
  message     text        NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_valid
    CHECK (type IN ('prospect_assigned', 'status_changed', 'follow_up_due'))
);--> statement-breakpoint

CREATE INDEX notifications_user_idx     ON public.notifications(user_id);--> statement-breakpoint
CREATE INDEX notifications_user_read_idx ON public.notifications(user_id, read_at);--> statement-breakpoint
CREATE INDEX notifications_org_idx      ON public.notifications(org_id);--> statement-breakpoint

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());--> statement-breakpoint

-- Service role inserts on behalf of actors, so no INSERT policy needed for anon/authed.
-- The admin client (service role) bypasses RLS entirely.

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());--> statement-breakpoint

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());--> statement-breakpoint
