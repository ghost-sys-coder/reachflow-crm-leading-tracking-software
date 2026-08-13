UPDATE public.custom_field_definitions
SET
  field_type = CASE WHEN field_type = 'select' THEN 'single_select' ELSE field_type END,
  options = coalesce(options, '[]'::jsonb),
  validation = coalesce(validation, '{}'::jsonb),
  display_order = CASE WHEN display_order = 0 THEN coalesce(position, 0) ELSE display_order END;

ALTER TABLE public.custom_field_definitions
  ALTER COLUMN options SET DEFAULT '[]'::jsonb,
  ALTER COLUMN options SET NOT NULL;

ALTER TABLE public.custom_field_definitions
  DROP CONSTRAINT IF EXISTS cfd_type_valid;

ALTER TABLE public.custom_field_definitions
  DROP CONSTRAINT IF EXISTS custom_field_definitions_type_valid;

ALTER TABLE public.custom_field_definitions
  ADD CONSTRAINT custom_field_definitions_type_valid
  CHECK (field_type IN ('text','number','date','boolean','single_select','url','currency'));

CREATE UNIQUE INDEX IF NOT EXISTS custom_field_definitions_org_name_uq
  ON public.custom_field_definitions (org_id, lower(name));
