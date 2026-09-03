CREATE TABLE public.gmail_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_account_id text NOT NULL,
  email_address text NOT NULL,
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text NOT NULL,
  granted_scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','error','revoked')),
  token_expires_at timestamptz,
  last_used_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gmail_connections_org_user_uq UNIQUE (org_id, user_id),
  CONSTRAINT gmail_connections_google_account_uq UNIQUE (google_account_id)
);

CREATE INDEX gmail_connections_org_idx ON public.gmail_connections(org_id);

ALTER TABLE public.messages
  ADD COLUMN provider text,
  ADD COLUMN provider_message_id text,
  ADD COLUMN provider_thread_id text,
  ADD COLUMN connection_id uuid REFERENCES public.gmail_connections(id) ON DELETE SET NULL,
  ADD COLUMN delivery_status text;

CREATE UNIQUE INDEX messages_gmail_provider_message_uq
  ON public.messages(connection_id, provider_message_id)
  WHERE provider = 'gmail' AND provider_message_id IS NOT NULL;

CREATE TABLE public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.gmail_connections(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'gmail',
  provider_message_id text,
  provider_thread_id text,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_deliveries_org_idx ON public.email_deliveries(org_id);
CREATE INDEX email_deliveries_message_idx ON public.email_deliveries(message_id);

ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY gmail_connections_select_own ON public.gmail_connections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = gmail_connections.org_id AND m.user_id = auth.uid()
  ));

CREATE POLICY gmail_connections_insert_own ON public.gmail_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = gmail_connections.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')
  ));

CREATE POLICY gmail_connections_update_own ON public.gmail_connections
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY gmail_connections_delete_own ON public.gmail_connections
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY email_deliveries_select ON public.email_deliveries
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = email_deliveries.org_id AND m.user_id = auth.uid()
  ));

CREATE POLICY email_deliveries_insert ON public.email_deliveries
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = email_deliveries.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')
  ));

CREATE POLICY email_deliveries_update ON public.email_deliveries
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = email_deliveries.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')
  ));
