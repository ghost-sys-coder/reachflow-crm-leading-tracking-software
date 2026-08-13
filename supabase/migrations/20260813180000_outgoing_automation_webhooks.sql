-- REQUIRED IN SUPABASE SQL EDITOR: outgoing webhook subscriptions and secret rotation.
ALTER TABLE public.webhook_endpoints ADD COLUMN IF NOT EXISTS previous_secret_ciphertext text;
ALTER TABLE public.webhook_endpoints ADD COLUMN IF NOT EXISTS previous_secret_expires_at timestamptz;
ALTER TABLE public.webhook_endpoints ADD COLUMN IF NOT EXISTS secret_last_four text;
UPDATE public.webhook_endpoints SET subscribed_events=ARRAY['test.ping'] WHERE subscribed_events IS NULL OR cardinality(subscribed_events)=0;
