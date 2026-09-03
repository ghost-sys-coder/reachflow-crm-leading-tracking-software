ALTER TABLE public.gmail_connections
  ADD COLUMN history_id text,
  ADD COLUMN watch_expiration_at timestamptz,
  ADD COLUMN last_synced_at timestamptz,
  ADD COLUMN sync_status text NOT NULL DEFAULT 'idle';

ALTER TABLE public.gmail_connections
  ADD CONSTRAINT gmail_connections_sync_status_valid
  CHECK (sync_status IN ('idle', 'syncing', 'error'));

ALTER TABLE public.prospects
  ADD COLUMN last_reply_at timestamptz;

ALTER TABLE public.messages
  ADD COLUMN internet_message_id text,
  ADD COLUMN in_reply_to text,
  ADD COLUMN references_header text,
  ADD COLUMN sender_email text,
  ADD COLUMN recipient_emails text[],
  ADD COLUMN cc_emails text[],
  ADD COLUMN snippet text,
  ADD COLUMN gmail_label_ids text[],
  ADD COLUMN is_read boolean NOT NULL DEFAULT true,
  ADD COLUMN synced_at timestamptz;

CREATE INDEX messages_org_thread_idx
  ON public.messages(org_id, connection_id, provider_thread_id)
  WHERE provider = 'gmail' AND provider_thread_id IS NOT NULL;

CREATE INDEX messages_prospect_email_activity_idx
  ON public.messages(prospect_id, recorded_at DESC)
  WHERE provider = 'gmail';

ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_valid;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_action_valid
  CHECK (action IN ('prospect_created','status_changed','assignee_changed','note_updated','prospect_updated','message_saved','outreach_sent','reply_received'));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_valid;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_valid
  CHECK (type IN ('prospect_assigned','status_changed','follow_up_due','gmail_reply'));

