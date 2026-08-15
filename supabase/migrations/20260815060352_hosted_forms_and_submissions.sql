-- REQUIRED IN SUPABASE SQL EDITOR: Hosted lead forms, consent evidence, and submission history.
-- Safe to rerun. Public submissions are written by the server with the service role;
-- authenticated access remains restricted to workspace administrators.

create table if not exists public.hosted_forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null unique references public.lead_sources(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  title text not null check (char_length(title) between 1 and 120),
  description text,
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  require_consent boolean not null default true,
  consent_text text not null,
  submit_label text not null default 'Submit',
  success_message text not null default 'Thank you. We have received your details.',
  redirect_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  form_id uuid not null references public.hosted_forms(id) on delete cascade,
  ingestion_event_id uuid unique references public.ingestion_events(id) on delete set null,
  consent_given boolean not null default false,
  consent_text text,
  ip_hash text,
  user_agent text,
  referrer text,
  submitted_at timestamptz not null default now()
);

create index if not exists hosted_forms_org_status_idx
  on public.hosted_forms(org_id, status, created_at desc);
create index if not exists form_submissions_form_submitted_idx
  on public.form_submissions(form_id, submitted_at desc);
create index if not exists form_submissions_org_submitted_idx
  on public.form_submissions(org_id, submitted_at desc);
create index if not exists form_submissions_rate_limit_idx
  on public.form_submissions(form_id, ip_hash, submitted_at desc)
  where ip_hash is not null;

alter table public.hosted_forms enable row level security;
alter table public.form_submissions enable row level security;

drop policy if exists hosted_forms_select on public.hosted_forms;
create policy hosted_forms_select on public.hosted_forms
  for select to authenticated
  using (exists (
    select 1 from public.organization_members membership
    where membership.org_id = hosted_forms.org_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
  ));

drop policy if exists hosted_forms_admin on public.hosted_forms;
create policy hosted_forms_admin on public.hosted_forms
  for all to authenticated
  using (exists (
    select 1 from public.organization_members membership
    where membership.org_id = hosted_forms.org_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
  ))
  with check (exists (
    select 1 from public.organization_members membership
    where membership.org_id = hosted_forms.org_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
  ));

drop policy if exists form_submissions_select on public.form_submissions;
create policy form_submissions_select on public.form_submissions
  for select to authenticated
  using (exists (
    select 1 from public.organization_members membership
    where membership.org_id = form_submissions.org_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
  ));

drop policy if exists form_submissions_admin on public.form_submissions;
create policy form_submissions_admin on public.form_submissions
  for all to authenticated
  using (exists (
    select 1 from public.organization_members membership
    where membership.org_id = form_submissions.org_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
  ))
  with check (exists (
    select 1 from public.organization_members membership
    where membership.org_id = form_submissions.org_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
  ));

notify pgrst, 'reload schema';

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('hosted_forms','form_submissions')
order by table_name, ordinal_position;
