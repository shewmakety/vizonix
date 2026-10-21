-- Reader personalization for the aviation briefing.
-- Apply this file in the Supabase SQL editor. The app does not apply it.
-- Server code uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only.
-- Do not put the service role key in a NEXT_PUBLIC_ variable.
--
-- Row level security is on and there are no policies for anon or authenticated.
-- The Data API cannot read or write these rows without the service role key,
-- which bypasses row level security.

create table public.subscriber_prefs (
  email text primary key,
  segment text not null,
  excluded_sections text[] not null default '{}',
  source text,
  updated_at timestamptz not null default now(),
  constraint subscriber_prefs_email_lower check (email = lower(email)),
  constraint subscriber_prefs_excluded_size check (cardinality(excluded_sections) <= 24),
  constraint subscriber_prefs_source_length check (source is null or char_length(source) <= 40)
);

comment on table public.subscriber_prefs is
  'Sections a confirmed reader turned off. Empty excluded_sections means the full issue.';

comment on column public.subscriber_prefs.source is
  'Campaign code from the signup link, for example linkedin. Optional.';

create table public.topic_suggestions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  segment text not null,
  "text" text not null,
  source text,
  created_at timestamptz not null default now(),
  status text not null default 'new',
  constraint topic_suggestions_email_lower check (email = lower(email)),
  constraint topic_suggestions_text_length check (char_length("text") between 1 and 400),
  constraint topic_suggestions_source_length check (source is null or char_length(source) <= 40)
);

comment on table public.topic_suggestions is
  'Topic ideas from signup or the preferences page. status starts at new.';

create index subscriber_prefs_segment_idx on public.subscriber_prefs (segment);

create index topic_suggestions_email_created_idx
  on public.topic_suggestions (email, created_at desc);

create index topic_suggestions_status_idx
  on public.topic_suggestions (status, created_at desc);

alter table public.subscriber_prefs enable row level security;
alter table public.topic_suggestions enable row level security;

revoke all on table public.subscriber_prefs from public, anon, authenticated;
revoke all on table public.topic_suggestions from public, anon, authenticated;

grant all on table public.subscriber_prefs to service_role;
grant all on table public.topic_suggestions to service_role;
