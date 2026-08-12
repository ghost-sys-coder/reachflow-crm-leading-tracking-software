ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS state text;

UPDATE public.prospects SET platform = 'x' WHERE platform = 'twitter';

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_platform_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_platform_valid
  CHECK (platform IN ('instagram', 'email', 'facebook', 'linkedin', 'x', 'call', 'other'));

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_valid;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_valid
  CHECK (message_type IN ('instagram_dm', 'cold_email', 'facebook_message', 'linkedin_message', 'x_message', 'call_note', 'follow_up', 'custom'));

ALTER TABLE public.message_templates DROP CONSTRAINT IF EXISTS message_templates_type_valid;
ALTER TABLE public.message_templates ADD CONSTRAINT message_templates_type_valid
  CHECK (message_type IN ('instagram_dm', 'cold_email', 'facebook_message', 'linkedin_message', 'x_message', 'call_note', 'follow_up', 'custom'));

ALTER TABLE public.generation_logs DROP CONSTRAINT IF EXISTS generation_logs_type_valid;
ALTER TABLE public.generation_logs ADD CONSTRAINT generation_logs_type_valid
  CHECK (message_type IN ('instagram_dm', 'cold_email', 'facebook_message', 'linkedin_message', 'x_message', 'call_note', 'follow_up', 'custom'));

ALTER TABLE public.sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_type_valid;
ALTER TABLE public.sequence_steps ADD CONSTRAINT sequence_steps_type_valid
  CHECK (message_type IN ('instagram_dm', 'cold_email', 'facebook_message', 'linkedin_message', 'x_message', 'call_note', 'follow_up', 'custom'));
