-- Add assigned_to column to prospects for lead assignment
-- RLS is already covered by the existing prospects_update policy
-- (can_write_in_org). The admin-only guard lives in the server action.

ALTER TABLE public.prospects
  ADD COLUMN assigned_to uuid
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;--> statement-breakpoint

CREATE INDEX prospects_assigned_to_idx ON public.prospects USING btree (assigned_to);--> statement-breakpoint
