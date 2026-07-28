CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  channel text,
  goal text,
  budget_cents integer,
  currency text NOT NULL DEFAULT 'USD',
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_at timestamptz,
  end_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_status_valid CHECK (status IN ('draft','active','paused','completed','archived')),
  CONSTRAINT campaigns_budget_nonnegative CHECK (budget_cents IS NULL OR budget_cents >= 0),
  CONSTRAINT campaigns_dates_valid CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
);

CREATE INDEX campaigns_org_idx ON public.campaigns(org_id);
CREATE INDEX campaigns_org_status_idx ON public.campaigns(org_id, status);
CREATE INDEX campaigns_owner_idx ON public.campaigns(owner_id);

CREATE TABLE public.campaign_prospects (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, prospect_id)
);

CREATE INDEX campaign_prospects_prospect_idx ON public.campaign_prospects(prospect_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT
  WITH CHECK (can_write_in_org(org_id));
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE
  USING (can_write_in_org(org_id)) WITH CHECK (can_write_in_org(org_id));
CREATE POLICY "campaigns_delete" ON public.campaigns FOR DELETE
  USING (is_org_admin(org_id));

CREATE POLICY "campaign_prospects_select" ON public.campaign_prospects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND is_org_member(c.org_id)
    )
  );
CREATE POLICY "campaign_prospects_insert" ON public.campaign_prospects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.prospects p ON p.id = prospect_id AND p.org_id = c.org_id
      WHERE c.id = campaign_id AND can_write_in_org(c.org_id)
    )
  );
CREATE POLICY "campaign_prospects_delete" ON public.campaign_prospects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND can_write_in_org(c.org_id)
    )
  );
