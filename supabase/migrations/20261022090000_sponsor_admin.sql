-- Sponsor companies, paid bookings, and inquiries.
-- Apply this file in the Supabase SQL editor. The app does not run it.
-- Server code uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only.
-- No browser policy: anon and authenticated have no grants, and RLS is forced.
-- content/bookings.json had no rows when this migration was added.
-- The app copies any rows that later appear in that file on the next read.

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact text not null,
  email text not null,
  url text,
  logo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsors_email_lowercase check (email = lower(email)),
  constraint sponsors_email_unique unique (email),
  constraint sponsors_company_length check (char_length(company) between 1 and 160),
  constraint sponsors_contact_length check (char_length(contact) between 1 and 120),
  constraint sponsors_email_length check (char_length(email) between 3 and 200),
  constraint sponsors_url_length check (url is null or char_length(url) between 1 and 500),
  constraint sponsors_logo_length check (logo is null or char_length(logo) between 1 and 500)
);

comment on table public.sponsors is
  'Sponsor companies. Service role only.';

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references public.sponsors (id) on delete set null,
  segment text not null,
  placement text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'paid',
  price numeric(10, 2),
  stripe_session_id text,
  headline text,
  body text,
  cta text,
  url text,
  logo text,
  founding boolean not null default false,
  exclusivity_requested boolean not null default false,
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates check (end_date >= start_date),
  constraint bookings_segment_length check (char_length(segment) between 1 and 40),
  constraint bookings_placement_known check (
    placement in (
      'primary',
      'secondary',
      'classified',
      'banner',
      'featured',
      'bundle',
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08'
    )
  ),
  constraint bookings_status_known check (
    status in ('pending', 'paid', 'active', 'comped', 'cancelled')
  ),
  constraint bookings_price_nonnegative check (price is null or price >= 0),
  constraint bookings_stripe_session_unique unique (stripe_session_id),
  constraint bookings_legacy_unique unique (legacy_id),
  constraint bookings_headline_length check (headline is null or char_length(headline) between 1 and 120),
  constraint bookings_body_length check (body is null or char_length(body) between 1 and 1200),
  constraint bookings_cta_length check (cta is null or char_length(cta) between 1 and 80),
  constraint bookings_url_length check (url is null or char_length(url) between 1 and 500),
  constraint bookings_logo_length check (logo is null or char_length(logo) between 1 and 500),
  constraint bookings_stripe_length check (
    stripe_session_id is null or char_length(stripe_session_id) between 1 and 200
  ),
  constraint bookings_legacy_length check (legacy_id is null or char_length(legacy_id) between 1 and 200)
);

comment on table public.bookings is
  'Sponsorship inventory for newsletter slots and section spots 01-08. Service role only.';

comment on column public.bookings.price is 'Price in US dollars.';

create index bookings_sponsor_id_idx on public.bookings (sponsor_id);
create index bookings_segment_placement_dates_idx
  on public.bookings (segment, placement, start_date, end_date);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  promote text not null,
  budget text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiries_email_lowercase check (email = lower(email)),
  constraint inquiries_name_length check (char_length(name) between 1 and 120),
  constraint inquiries_company_length check (char_length(company) between 1 and 160),
  constraint inquiries_email_length check (char_length(email) between 3 and 200),
  constraint inquiries_promote_length check (char_length(promote) between 1 and 300),
  constraint inquiries_budget_length check (budget is null or char_length(budget) between 1 and 80),
  constraint inquiries_message_length check (char_length(message) between 1 and 4000),
  constraint inquiries_status_known check (status in ('new', 'read', 'closed'))
);

comment on table public.inquiries is
  'Sponsorship inquiries from the public form and the admin. Service role only.';

create index inquiries_created_idx on public.inquiries (created_at desc);

alter table public.sponsors enable row level security;
alter table public.sponsors force row level security;
alter table public.bookings enable row level security;
alter table public.bookings force row level security;
alter table public.inquiries enable row level security;
alter table public.inquiries force row level security;

revoke all on table public.sponsors from public, anon, authenticated;
revoke all on table public.bookings from public, anon, authenticated;
revoke all on table public.inquiries from public, anon, authenticated;

grant select, insert, update, delete on table public.sponsors to service_role;
grant select, insert, update, delete on table public.bookings to service_role;
grant select, insert, update, delete on table public.inquiries to service_role;
