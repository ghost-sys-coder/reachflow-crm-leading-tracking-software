CREATE TABLE public.message_templates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  message_type text      NOT NULL,
  subject    text,
  body       text        NOT NULL,
  created_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_templates_type_valid
    CHECK (message_type IN ('instagram_dm', 'cold_email', 'follow_up', 'custom'))
);--> statement-breakpoint

CREATE INDEX message_templates_org_idx ON public.message_templates(org_id);--> statement-breakpoint

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Any org member can read templates
CREATE POLICY "templates_select" ON message_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = message_templates.org_id
        AND user_id = auth.uid()
    )
  );--> statement-breakpoint

-- Editors and admins can create / update
CREATE POLICY "templates_insert" ON message_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = message_templates.org_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );--> statement-breakpoint

CREATE POLICY "templates_update" ON message_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = message_templates.org_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );--> statement-breakpoint

-- Only admins can delete
CREATE POLICY "templates_delete" ON message_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = message_templates.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );--> statement-breakpoint
