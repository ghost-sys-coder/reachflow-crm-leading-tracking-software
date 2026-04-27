-- Opt-in flag for the daily follow-up digest email (default true)
ALTER TABLE public.profiles
  ADD COLUMN follow_up_digest boolean NOT NULL DEFAULT true;--> statement-breakpoint
