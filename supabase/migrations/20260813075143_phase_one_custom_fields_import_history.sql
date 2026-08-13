CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','number','date','boolean','single_select','url','currency')),
  help_text text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name),
  CONSTRAINT custom_field_options_array CHECK (jsonb_typeof(options) = 'array')
);

ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS field_type text,
  ADD COLUMN IF NOT EXISTS help_text text,
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.custom_field_definitions SET field_type = coalesce(field_type, 'text');
ALTER TABLE public.custom_field_definitions ALTER COLUMN field_type SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  definition_id uuid NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, definition_id)
);

CREATE INDEX IF NOT EXISTS custom_field_definitions_org_order_idx ON public.custom_field_definitions (org_id, is_archived, display_order);
CREATE INDEX IF NOT EXISTS custom_field_values_prospect_idx ON public.custom_field_values (prospect_id);
CREATE INDEX IF NOT EXISTS custom_field_values_definition_idx ON public.custom_field_values (definition_id);

CREATE TABLE IF NOT EXISTS public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  filename text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_rows integer NOT NULL,
  imported_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','rolled_back','failed')),
  rolled_back_at timestamptz,
  rolled_back_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.import_batch_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  row_number integer NOT NULL,
  operation text NOT NULL DEFAULT 'created' CHECK (operation IN ('created','updated','skipped')),
  snapshot_before jsonb,
  snapshot_after jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_batch_id, row_number)
);

CREATE INDEX IF NOT EXISTS import_batches_org_created_idx ON public.import_batches (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS import_batch_rows_batch_idx ON public.import_batch_rows (import_batch_id);
CREATE INDEX IF NOT EXISTS import_batch_rows_prospect_idx ON public.import_batch_rows (prospect_id);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batch_rows ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_definitions, public.custom_field_values, public.import_batches, public.import_batch_rows TO authenticated;

DROP POLICY IF EXISTS "custom_definitions_select" ON public.custom_field_definitions;
CREATE POLICY "custom_definitions_select" ON public.custom_field_definitions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = custom_field_definitions.org_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "custom_definitions_write" ON public.custom_field_definitions;
CREATE POLICY "custom_definitions_write" ON public.custom_field_definitions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = custom_field_definitions.org_id AND m.user_id = auth.uid() AND m.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = custom_field_definitions.org_id AND m.user_id = auth.uid() AND m.role = 'admin'));
DROP POLICY IF EXISTS "custom_values_select" ON public.custom_field_values;
CREATE POLICY "custom_values_select" ON public.custom_field_values FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = custom_field_values.org_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "custom_values_write" ON public.custom_field_values;
CREATE POLICY "custom_values_write" ON public.custom_field_values FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = custom_field_values.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = custom_field_values.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')));
DROP POLICY IF EXISTS "import_batches_select" ON public.import_batches;
CREATE POLICY "import_batches_select" ON public.import_batches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = import_batches.org_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "import_batches_insert" ON public.import_batches;
CREATE POLICY "import_batches_insert" ON public.import_batches FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = import_batches.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')));
DROP POLICY IF EXISTS "import_batches_update" ON public.import_batches;
CREATE POLICY "import_batches_update" ON public.import_batches FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = import_batches.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = import_batches.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')));
DROP POLICY IF EXISTS "import_batches_delete" ON public.import_batches;
CREATE POLICY "import_batches_delete" ON public.import_batches FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = import_batches.org_id AND m.user_id = auth.uid() AND m.role = 'admin'));
DROP POLICY IF EXISTS "import_rows_select" ON public.import_batch_rows;
CREATE POLICY "import_rows_select" ON public.import_batch_rows FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.import_batches b JOIN public.organization_members m ON m.org_id = b.org_id WHERE b.id = import_batch_rows.import_batch_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "import_rows_write" ON public.import_batch_rows;
CREATE POLICY "import_rows_write" ON public.import_batch_rows FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.import_batches b JOIN public.organization_members m ON m.org_id = b.org_id WHERE b.id = import_batch_rows.import_batch_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM public.import_batches b JOIN public.organization_members m ON m.org_id = b.org_id WHERE b.id = import_batch_rows.import_batch_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')));
