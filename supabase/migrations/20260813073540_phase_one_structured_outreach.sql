ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS call_outcome text,
  ADD COLUMN IF NOT EXISTS call_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS callback_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS reply_intent text,
  ADD COLUMN IF NOT EXISTS objection_code text,
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND conname = 'messages_direction_valid') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_direction_valid CHECK (direction IN ('outbound', 'inbound'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND conname = 'messages_call_outcome_valid') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_call_outcome_valid CHECK (call_outcome IS NULL OR call_outcome IN ('connected', 'no_answer', 'voicemail', 'callback_requested', 'wrong_number', 'disqualified'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND conname = 'messages_call_duration_valid') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_call_duration_valid CHECK (call_duration_seconds IS NULL OR call_duration_seconds BETWEEN 0 AND 86400);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND conname = 'messages_reply_intent_valid') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_reply_intent_valid CHECK (reply_intent IS NULL OR reply_intent IN ('interested', 'not_now', 'not_interested', 'question', 'wrong_contact', 'disqualified'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND conname = 'messages_structured_metadata_valid') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_structured_metadata_valid CHECK (
      (message_type = 'call_note' OR (call_outcome IS NULL AND call_duration_seconds IS NULL AND callback_at IS NULL AND next_action IS NULL))
      AND (direction = 'inbound' OR (reply_intent IS NULL AND objection_code IS NULL))
      AND (call_outcome <> 'callback_requested' OR callback_at IS NOT NULL)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS messages_org_direction_recorded_idx
  ON public.messages (org_id, direction, recorded_at DESC);

CREATE INDEX IF NOT EXISTS messages_org_call_outcome_idx
  ON public.messages (org_id, call_outcome)
  WHERE call_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_org_reply_intent_idx
  ON public.messages (org_id, reply_intent)
  WHERE reply_intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_callback_idx
  ON public.messages (org_id, callback_at)
  WHERE callback_at IS NOT NULL;
