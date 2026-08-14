-- REQUIRED IN SUPABASE SQL EDITOR: repair webhook secret-rotation columns.
-- Safe to rerun. Fixes PostgREST error: secret_last_four not found in schema cache.

ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS previous_secret_ciphertext text,
  ADD COLUMN IF NOT EXISTS previous_secret_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS secret_last_four text;

UPDATE public.webhook_endpoints
SET subscribed_events = ARRAY['test.ping']::text[]
WHERE subscribed_events IS NULL OR cardinality(subscribed_events) = 0;

COMMENT ON COLUMN public.webhook_endpoints.secret_last_four IS
  'Non-secret suffix used to identify the active webhook signing secret.';

-- Ask Supabase PostgREST to refresh its schema cache immediately.
NOTIFY pgrst, 'reload schema';

-- Verification: all three rows should be returned.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'webhook_endpoints'
  AND column_name IN (
    'previous_secret_ciphertext',
    'previous_secret_expires_at',
    'secret_last_four'
  )
ORDER BY column_name;
