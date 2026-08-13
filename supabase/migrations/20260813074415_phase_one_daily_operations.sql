ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS snooze_reason text;

CREATE INDEX IF NOT EXISTS prospects_org_follow_up_idx ON public.prospects (org_id, follow_up_at);
CREATE INDEX IF NOT EXISTS prospects_org_snoozed_idx ON public.prospects (org_id, snoozed_until) WHERE snoozed_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'private' CHECK (scope IN ('private', 'shared')),
  entity_type text NOT NULL DEFAULT 'prospects' CHECK (entity_type IN ('prospects', 'pipeline')),
  filter_version integer NOT NULL DEFAULT 1,
  filter_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_views_name_not_blank CHECK (length(trim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS saved_views_private_name_uq ON public.saved_views (owner_id, entity_type, lower(name)) WHERE scope = 'private';
CREATE UNIQUE INDEX IF NOT EXISTS saved_views_shared_name_uq ON public.saved_views (org_id, entity_type, lower(name)) WHERE scope = 'shared';
CREATE UNIQUE INDEX IF NOT EXISTS saved_views_default_uq ON public.saved_views (owner_id, entity_type) WHERE is_default;
CREATE INDEX IF NOT EXISTS saved_views_org_idx ON public.saved_views (org_id, entity_type);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT tasks_completion_consistent CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR (status <> 'completed' AND completed_at IS NULL))
);
CREATE INDEX IF NOT EXISTS tasks_org_status_due_idx ON public.tasks (org_id, status, due_at);
CREATE INDEX IF NOT EXISTS tasks_assignee_status_due_idx ON public.tasks (assigned_to, status, due_at);
CREATE INDEX IF NOT EXISTS tasks_prospect_idx ON public.tasks (prospect_id);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_views, public.tasks TO authenticated;

DROP POLICY IF EXISTS "saved_views_select" ON public.saved_views;
CREATE POLICY "saved_views_select" ON public.saved_views FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = saved_views.org_id AND m.user_id = auth.uid())
  AND (scope = 'shared' OR owner_id = auth.uid())
);
DROP POLICY IF EXISTS "saved_views_insert" ON public.saved_views;
CREATE POLICY "saved_views_insert" ON public.saved_views FOR INSERT TO authenticated WITH CHECK (
  owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = saved_views.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor'))
);
DROP POLICY IF EXISTS "saved_views_update" ON public.saved_views;
CREATE POLICY "saved_views_update" ON public.saved_views FOR UPDATE TO authenticated USING (
  owner_id = auth.uid() OR (scope = 'shared' AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = saved_views.org_id AND m.user_id = auth.uid() AND m.role = 'admin'))
) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = saved_views.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')));
DROP POLICY IF EXISTS "saved_views_delete" ON public.saved_views;
CREATE POLICY "saved_views_delete" ON public.saved_views FOR DELETE TO authenticated USING (
  owner_id = auth.uid() OR (scope = 'shared' AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = saved_views.org_id AND m.user_id = auth.uid() AND m.role = 'admin'))
);

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = tasks.org_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = tasks.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor'))
);
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = tasks.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor'))
) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = tasks.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')));
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = tasks.org_id AND m.user_id = auth.uid() AND m.role = 'admin')
);
