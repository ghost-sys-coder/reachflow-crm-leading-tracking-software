CREATE TABLE public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connected_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_account_id text NOT NULL,
  phone_number_id text NOT NULL,
  display_phone_number text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','error','revoked')),
  last_message_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_connections_org_uq UNIQUE (org_id),
  CONSTRAINT whatsapp_connections_phone_number_uq UNIQUE (phone_number_id)
);

CREATE INDEX whatsapp_connections_org_idx ON public.whatsapp_connections(org_id);
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_connections_select ON public.whatsapp_connections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members member WHERE member.org_id = whatsapp_connections.org_id AND member.user_id = auth.uid()));
CREATE POLICY whatsapp_connections_insert ON public.whatsapp_connections FOR INSERT TO authenticated
  WITH CHECK (connected_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_members member WHERE member.org_id = whatsapp_connections.org_id AND member.user_id = auth.uid() AND member.role = 'admin'));
CREATE POLICY whatsapp_connections_update ON public.whatsapp_connections FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members member WHERE member.org_id = whatsapp_connections.org_id AND member.user_id = auth.uid() AND member.role = 'admin'));
CREATE POLICY whatsapp_connections_delete ON public.whatsapp_connections FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members member WHERE member.org_id = whatsapp_connections.org_id AND member.user_id = auth.uid() AND member.role = 'admin'));

CREATE TABLE public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','unmatched','failed')),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_webhook_events_provider_uq UNIQUE (provider_event_id, event_type)
);

CREATE INDEX whatsapp_webhook_events_connection_idx ON public.whatsapp_webhook_events(connection_id);
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_webhook_events_select ON public.whatsapp_webhook_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_connections connection
    JOIN public.organization_members member ON member.org_id = connection.org_id
    WHERE connection.id = whatsapp_webhook_events.connection_id AND member.user_id = auth.uid()
  ));

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_valid;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_valid CHECK (message_type IN ('instagram_dm','cold_email','whatsapp_message','facebook_message','linkedin_message','x_message','call_note','follow_up','custom'));
ALTER TABLE public.message_templates DROP CONSTRAINT IF EXISTS message_templates_type_valid;
ALTER TABLE public.message_templates ADD CONSTRAINT message_templates_type_valid CHECK (message_type IN ('instagram_dm','cold_email','whatsapp_message','facebook_message','linkedin_message','x_message','call_note','follow_up','custom'));
ALTER TABLE public.generation_logs DROP CONSTRAINT IF EXISTS generation_logs_type_valid;
ALTER TABLE public.generation_logs ADD CONSTRAINT generation_logs_type_valid CHECK (message_type IN ('instagram_dm','cold_email','whatsapp_message','facebook_message','linkedin_message','x_message','call_note','follow_up','custom'));
ALTER TABLE public.sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_type_valid;
ALTER TABLE public.sequence_steps ADD CONSTRAINT sequence_steps_type_valid CHECK (message_type IN ('instagram_dm','cold_email','whatsapp_message','facebook_message','linkedin_message','x_message','call_note','follow_up','custom'));

CREATE UNIQUE INDEX messages_whatsapp_provider_message_uq ON public.messages(provider_message_id)
  WHERE provider = 'whatsapp' AND provider_message_id IS NOT NULL;
CREATE INDEX messages_whatsapp_prospect_activity_idx ON public.messages(prospect_id, recorded_at DESC)
  WHERE provider = 'whatsapp';
