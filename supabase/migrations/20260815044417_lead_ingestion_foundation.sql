-- REQUIRED IN SUPABASE SQL EDITOR: Lead ingestion foundation and generic inbound webhook.
-- Safe to rerun. Existing manual attribution sources remain valid and do not receive secrets.

alter table public.lead_sources
  add column if not exists secret_ciphertext text,
  add column if not exists secret_last_four text,
  add column if not exists previous_secret_ciphertext text,
  add column if not exists previous_secret_expires_at timestamptz,
  add column if not exists field_mappings jsonb not null default '{}'::jsonb,
  add column if not exists default_values jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_received_at timestamptz,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_failure_at timestamptz,
  add column if not exists failure_count integer not null default 0;

create table if not exists public.ingestion_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.lead_sources(id) on delete cascade,
  external_event_id text not null,
  status text not null default 'received'
    check (status in ('received','processing','created','matched','failed')),
  outcome text,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  prospect_id uuid references public.prospects(id) on delete set null,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  replayed_from uuid references public.ingestion_events(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (source_id, external_event_id)
);

create index if not exists ingestion_events_org_received_idx
  on public.ingestion_events(org_id, received_at desc);
create index if not exists ingestion_events_source_status_idx
  on public.ingestion_events(source_id, status, received_at desc);
create index if not exists ingestion_events_prospect_idx
  on public.ingestion_events(prospect_id) where prospect_id is not null;
create unique index if not exists attribution_source_external_event_uq
  on public.prospect_attributions(source_id, external_id)
  where source_id is not null and external_id is not null;

alter table public.ingestion_events enable row level security;

drop policy if exists ingestion_events_select on public.ingestion_events;
create policy ingestion_events_select on public.ingestion_events
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_members membership
      where membership.org_id = ingestion_events.org_id
        and membership.user_id = auth.uid()
        and membership.role = 'admin'
    )
  );

drop policy if exists ingestion_events_admin on public.ingestion_events;
create policy ingestion_events_admin on public.ingestion_events
  for all to authenticated
  using (
    exists (
      select 1 from public.organization_members membership
      where membership.org_id = ingestion_events.org_id
        and membership.user_id = auth.uid()
        and membership.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.organization_members membership
      where membership.org_id = ingestion_events.org_id
        and membership.user_id = auth.uid()
        and membership.role = 'admin'
    )
  );

-- Source creation, secret rotation, mappings, and routing defaults are admin-only.
drop policy if exists lead_sources_write on public.lead_sources;
drop policy if exists lead_sources_admin on public.lead_sources;
create policy lead_sources_admin on public.lead_sources
  for all to authenticated
  using (
    exists (
      select 1 from public.organization_members membership
      where membership.org_id = lead_sources.org_id
        and membership.user_id = auth.uid()
        and membership.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.organization_members membership
      where membership.org_id = lead_sources.org_id
        and membership.user_id = auth.uid()
        and membership.role = 'admin'
    )
  );

notify pgrst, 'reload schema';

-- Verification: ingestion columns should exist and RLS should be enabled.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('lead_sources', 'ingestion_events')
  and column_name in (
    'secret_ciphertext','field_mappings','default_values','external_event_id',
    'raw_payload','normalized_payload','status','prospect_id'
  )
order by table_name, ordinal_position;

select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('lead_sources', 'ingestion_events');
