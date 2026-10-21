-- Reader topic choices and suggestions.
-- Apply this file in the Supabase SQL editor. The app does not run it.
-- Server code uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only.
-- No browser policy: anon and authenticated have no grants, and RLS is forced.

create table public.subscriber_prefs (
  email text primary key,
  segment text not null,
  excluded_sections text[] not null default '{}',
  source text,
  updated_at timestamptz not null default now(),
  constraint subscriber_prefs_email_lowercase check (email = lower(email)),
  constraint subscriber_prefs_segment_length check (char_length(segment) between 1 and 40),
  constraint subscriber_prefs_source_length check (source is null or char_length(source) between 1 and 40),
  constraint subscriber_prefs_excluded_no_nulls check (array_position(excluded_sections, null) is null)
);

comment on table public.subscriber_prefs is
  'Per-reader topic exclusions. Empty excluded_sections means the full issue. Service role only.';

create index subscriber_prefs_segment_idx on public.subscriber_prefs (segment);

create table public.topic_suggestions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  segment text not null,
  text text not null,
  source text,
  created_at timestamptz not null default now(),
  status text not null default 'new',
  constraint topic_suggestions_email_lowercase check (email = lower(email)),
  constraint topic_suggestions_segment_length check (char_length(segment) between 1 and 40),
  constraint topic_suggestions_text_length check (char_length(text) between 1 and 500),
  constraint topic_suggestions_source_length check (source is null or char_length(source) between 1 and 40),
  constraint topic_suggestions_status_length check (char_length(status) between 1 and 40)
);

comment on table public.topic_suggestions is
  'Reader topic suggestions. status defaults to new. Service role only.';

create index topic_suggestions_email_created_idx on public.topic_suggestions (email, created_at desc);
create index topic_suggestions_status_created_idx on public.topic_suggestions (status, created_at desc);

alter table public.subscriber_prefs enable row level security;
alter table public.subscriber_prefs force row level security;
alter table public.topic_suggestions enable row level security;
alter table public.topic_suggestions force row level security;

revoke all on table public.subscriber_prefs from public, anon, authenticated;
revoke all on table public.topic_suggestions from public, anon, authenticated;

grant select, insert, update, delete on table public.subscriber_prefs to service_role;
grant select, insert, update, delete on table public.topic_suggestions to service_role;
