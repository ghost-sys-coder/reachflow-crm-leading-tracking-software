ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS access_token_ciphertext text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS meta_user_id text,
  ADD COLUMN IF NOT EXISTS verified_name text,
  ADD COLUMN IF NOT EXISTS connection_method text NOT NULL DEFAULT 'environment',
  ADD COLUMN IF NOT EXISTS granted_scopes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS deauthorized_at timestamptz;

ALTER TABLE public.whatsapp_connections
  DROP CONSTRAINT IF EXISTS whatsapp_connections_method_valid;
ALTER TABLE public.whatsapp_connections
  ADD CONSTRAINT whatsapp_connections_method_valid
  CHECK (connection_method IN ('environment', 'embedded_signup'));

CREATE INDEX IF NOT EXISTS whatsapp_connections_meta_user_idx
  ON public.whatsapp_connections(meta_user_id)
  WHERE meta_user_id IS NOT NULL;

COMMENT ON COLUMN public.whatsapp_connections.access_token_ciphertext IS
  'AES-256-GCM encrypted Meta business access token. Never expose through client APIs.';
COMMENT ON COLUMN public.whatsapp_connections.connection_method IS
  'environment is the legacy deployment-wide connection; embedded_signup is workspace-owned.';
