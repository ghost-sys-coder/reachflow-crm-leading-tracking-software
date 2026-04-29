-- Add custom_fields JSONB column to existing prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}';--> statement-breakpoint

-- Custom field definitions per org
CREATE TABLE public.custom_field_definitions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  field_type text        NOT NULL,
  options    jsonb,
  position   integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cfd_type_valid CHECK (field_type IN ('text','number','boolean','date','select'))
);--> statement-breakpoint

CREATE INDEX cfd_org_idx ON public.custom_field_definitions(org_id);--> statement-breakpoint

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "cfd_select" ON public.custom_field_definitions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = custom_field_definitions.org_id AND user_id = auth.uid())
  );--> statement-breakpoint

CREATE POLICY "cfd_insert" ON public.custom_field_definitions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = custom_field_definitions.org_id AND user_id = auth.uid() AND role = 'admin')
  );--> statement-breakpoint

CREATE POLICY "cfd_update" ON public.custom_field_definitions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = custom_field_definitions.org_id AND user_id = auth.uid() AND role = 'admin')
  );--> statement-breakpoint

CREATE POLICY "cfd_delete" ON public.custom_field_definitions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = custom_field_definitions.org_id AND user_id = auth.uid() AND role = 'admin')
  );--> statement-breakpoint
