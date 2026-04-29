-- Sequence templates
CREATE TABLE public.sequences (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX sequences_org_idx ON public.sequences(org_id);--> statement-breakpoint

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "sequences_select" ON public.sequences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = sequences.org_id AND user_id = auth.uid())
  );--> statement-breakpoint

CREATE POLICY "sequences_insert" ON public.sequences
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = sequences.org_id AND user_id = auth.uid() AND role IN ('admin','editor'))
  );--> statement-breakpoint

CREATE POLICY "sequences_update" ON public.sequences
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = sequences.org_id AND user_id = auth.uid() AND role IN ('admin','editor'))
  );--> statement-breakpoint

CREATE POLICY "sequences_delete" ON public.sequences
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = sequences.org_id AND user_id = auth.uid() AND role = 'admin')
  );--> statement-breakpoint

-- Steps within a sequence template
CREATE TABLE public.sequence_steps (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id   uuid        NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  step_number   integer     NOT NULL,
  delay_days    integer     NOT NULL DEFAULT 0,
  message_type  text        NOT NULL,
  subject       text,
  body_template text        NOT NULL DEFAULT '',
  CONSTRAINT sequence_steps_type_valid  CHECK (message_type IN ('instagram_dm','cold_email','follow_up','custom')),
  CONSTRAINT sequence_steps_delay_check CHECK (delay_days >= 0),
  CONSTRAINT sequence_steps_step_check  CHECK (step_number >= 1),
  UNIQUE (sequence_id, step_number)
);--> statement-breakpoint

CREATE INDEX sequence_steps_seq_idx ON public.sequence_steps(sequence_id);--> statement-breakpoint

ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "sequence_steps_select" ON public.sequence_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sequences s
      JOIN organization_members m ON m.org_id = s.org_id
      WHERE s.id = sequence_steps.sequence_id AND m.user_id = auth.uid()
    )
  );--> statement-breakpoint

-- Prospect enrolled in a sequence
CREATE TABLE public.prospect_sequences (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id  uuid        NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  sequence_id  uuid        NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  enrolled_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL DEFAULT 'active',
  CONSTRAINT prospect_sequences_status_valid CHECK (status IN ('active','paused','completed','cancelled'))
);--> statement-breakpoint

CREATE INDEX prospect_sequences_prospect_idx ON public.prospect_sequences(prospect_id);--> statement-breakpoint
CREATE INDEX prospect_sequences_org_idx      ON public.prospect_sequences(org_id);--> statement-breakpoint

ALTER TABLE public.prospect_sequences ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "prospect_sequences_select" ON public.prospect_sequences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = prospect_sequences.org_id AND user_id = auth.uid())
  );--> statement-breakpoint

CREATE POLICY "prospect_sequences_insert" ON public.prospect_sequences
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = prospect_sequences.org_id AND user_id = auth.uid() AND role IN ('admin','editor'))
  );--> statement-breakpoint

CREATE POLICY "prospect_sequences_update" ON public.prospect_sequences
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_members WHERE org_id = prospect_sequences.org_id AND user_id = auth.uid() AND role IN ('admin','editor'))
  );--> statement-breakpoint

-- Individual step execution state per enrolled prospect
CREATE TABLE public.prospect_sequence_steps (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_sequence_id  uuid        NOT NULL REFERENCES public.prospect_sequences(id) ON DELETE CASCADE,
  step_id               uuid        NOT NULL REFERENCES public.sequence_steps(id) ON DELETE CASCADE,
  step_number           integer     NOT NULL,
  due_at                timestamptz NOT NULL,
  status                text        NOT NULL DEFAULT 'pending',
  completed_at          timestamptz,
  CONSTRAINT pss_status_valid CHECK (status IN ('pending','ready','skipped'))
);--> statement-breakpoint

CREATE INDEX pss_prospect_sequence_idx ON public.prospect_sequence_steps(prospect_sequence_id);--> statement-breakpoint
CREATE INDEX pss_due_status_idx        ON public.prospect_sequence_steps(due_at, status);--> statement-breakpoint

ALTER TABLE public.prospect_sequence_steps ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "pss_select" ON public.prospect_sequence_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prospect_sequences ps
      JOIN organization_members m ON m.org_id = ps.org_id
      WHERE ps.id = prospect_sequence_steps.prospect_sequence_id AND m.user_id = auth.uid()
    )
  );--> statement-breakpoint
