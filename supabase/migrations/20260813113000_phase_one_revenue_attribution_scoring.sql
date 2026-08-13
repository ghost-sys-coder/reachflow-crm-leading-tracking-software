-- REQUIRED IN SUPABASE SQL EDITOR: Phase One revenue, attribution, and scoring.
-- Safe to rerun: tables, indexes, policies, and seed rows are idempotent.

CREATE TABLE IF NOT EXISTS public.deal_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL, position integer NOT NULL DEFAULT 0, probability integer NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  is_closed boolean NOT NULL DEFAULT false, is_won boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL, source_type text NOT NULL DEFAULT 'manual', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT, campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  stage_id uuid NOT NULL REFERENCES public.deal_stages(id) ON DELETE RESTRICT, owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL, service text, value_cents bigint NOT NULL DEFAULT 0 CHECK(value_cents >= 0), currency text NOT NULL DEFAULT 'USD' CHECK(currency ~ '^[A-Z]{3}$'),
  probability integer NOT NULL DEFAULT 0 CHECK(probability BETWEEN 0 AND 100), expected_close_at date, won_at timestamptz, lost_at timestamptz, lost_reason text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.deal_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE, from_stage_id uuid REFERENCES public.deal_stages(id) ON DELETE SET NULL,
  to_stage_id uuid NOT NULL REFERENCES public.deal_stages(id) ON DELETE RESTRICT, changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  note text, changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.prospect_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE, source_id uuid REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'manual', source_name text NOT NULL DEFAULT 'Manual entry', campaign_name text, ad_set text, ad_name text, form_name text,
  landing_page text, referrer text, utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  external_id text, is_original boolean NOT NULL DEFAULT false, captured_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS public.lead_score_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default model', version integer NOT NULL DEFAULT 1, is_active boolean NOT NULL DEFAULT true,
  hot_threshold integer NOT NULL DEFAULT 70, warm_threshold integer NOT NULL DEFAULT 35, created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(org_id, version)
);
CREATE TABLE IF NOT EXISTS public.lead_score_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.lead_score_models(id) ON DELETE CASCADE, name text NOT NULL, field text NOT NULL,
  operator text NOT NULL, comparison_value text, points integer NOT NULL CHECK(points BETWEEN -100 AND 100), is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.prospect_scores (
  prospect_id uuid PRIMARY KEY REFERENCES public.prospects(id) ON DELETE CASCADE, org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.lead_score_models(id) ON DELETE CASCADE, score integer NOT NULL DEFAULT 0, band text NOT NULL DEFAULT 'cold',
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb, calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deals_org_stage_idx ON public.deals(org_id, stage_id);
CREATE INDEX IF NOT EXISTS deals_prospect_idx ON public.deals(prospect_id);
CREATE INDEX IF NOT EXISTS attribution_prospect_time_idx ON public.prospect_attributions(prospect_id, captured_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS attribution_one_original_idx ON public.prospect_attributions(prospect_id) WHERE is_original;
CREATE INDEX IF NOT EXISTS prospect_scores_org_score_idx ON public.prospect_scores(org_id, score DESC);

ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY; ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY; ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_attributions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.lead_score_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_score_rules ENABLE ROW LEVEL SECURITY; ALTER TABLE public.prospect_scores ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['deal_stages','deals','deal_stage_history','lead_sources','prospect_attributions','lead_score_models','lead_score_rules','prospect_scores'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = %I.org_id AND m.user_id = auth.uid()))', t || '_select', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = %I.org_id AND m.user_id = auth.uid() AND m.role IN (''admin'',''editor''))) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = %I.org_id AND m.user_id = auth.uid() AND m.role IN (''admin'',''editor'')))', t || '_write', t, t, t);
  END LOOP;
END $$;

INSERT INTO public.deal_stages(org_id,name,position,probability,is_closed,is_won)
SELECT o.id, s.name, s.position, s.probability, s.is_closed, s.is_won FROM public.organizations o CROSS JOIN
(VALUES ('Qualified',0,20,false,false),('Proposal',1,50,false,false),('Negotiation',2,75,false,false),('Won',3,100,true,true),('Lost',4,0,true,false)) s(name,position,probability,is_closed,is_won)
ON CONFLICT(org_id,name) DO NOTHING;
INSERT INTO public.lead_sources(org_id,name,source_type) SELECT id,'Manual entry','manual' FROM public.organizations ON CONFLICT(org_id,name) DO NOTHING;
INSERT INTO public.prospect_attributions(org_id,prospect_id,source_id,provider,source_name,is_original,captured_at)
SELECT p.org_id,p.id,s.id,'manual','Manual entry',true,p.created_at FROM public.prospects p JOIN public.lead_sources s ON s.org_id=p.org_id AND s.name='Manual entry'
WHERE NOT EXISTS (SELECT 1 FROM public.prospect_attributions a WHERE a.prospect_id=p.id AND a.is_original);
