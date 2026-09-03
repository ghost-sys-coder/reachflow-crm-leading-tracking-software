CREATE OR REPLACE FUNCTION public.claim_gmail_delivery(
  p_org_id uuid,
  p_message_id uuid,
  p_connection_id uuid,
  p_idempotency_key text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  claimed_id uuid;
BEGIN
  INSERT INTO public.email_deliveries (
    org_id, message_id, connection_id, provider, idempotency_key, status, attempt_count
  ) VALUES (
    p_org_id, p_message_id, p_connection_id, 'gmail', p_idempotency_key, 'sending', 1
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO claimed_id;

  IF claimed_id IS NOT NULL THEN
    RETURN claimed_id;
  END IF;

  UPDATE public.email_deliveries
  SET status = 'sending', attempt_count = attempt_count + 1, last_error = NULL, updated_at = now()
  WHERE idempotency_key = p_idempotency_key
    AND org_id = p_org_id
    AND message_id = p_message_id
    AND connection_id = p_connection_id
    AND status = 'failed'
  RETURNING id INTO claimed_id;

  RETURN claimed_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_gmail_delivery(uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_gmail_delivery(uuid, uuid, uuid, text) TO authenticated;

DROP POLICY IF EXISTS gmail_connections_update_own ON public.gmail_connections;
CREATE POLICY gmail_connections_update_own ON public.gmail_connections
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = gmail_connections.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')
  ))
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = gmail_connections.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')
  ));

DROP POLICY IF EXISTS gmail_connections_delete_own ON public.gmail_connections;
CREATE POLICY gmail_connections_delete_own ON public.gmail_connections
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = gmail_connections.org_id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')
  ));
