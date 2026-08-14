-- REQUIRED: Apply this file in the Supabase SQL Editor.
-- Repairs environments where the prospect location migration was only partly applied.
-- Both columns intentionally remain nullable because a prospect may not have a state
-- (for example, countries that do not use states or incomplete source data).

alter table public.prospects
  add column if not exists state text,
  add column if not exists country text;

comment on column public.prospects.state is
  'Optional state, province, region, or equivalent administrative area.';

comment on column public.prospects.country is
  'Optional prospect country.';

-- Refresh PostgREST so newly added columns are immediately available to the app.
notify pgrst, 'reload schema';

-- Verification result should show both rows with is_nullable = YES.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'prospects'
  and column_name in ('state', 'country')
order by column_name;
