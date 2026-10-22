-- Align sponsor inventory with the slots the issue renderer draws.
-- Apply this file in the Supabase SQL editor. The app does not run it.
-- Dropping the old placement check fails if a booking still uses
-- classified, banner, featured, or bundle. Move or cancel those rows first.
-- Inquiry segment and placement stay null on older rows.

begin;

alter table public.bookings drop constraint if exists bookings_placement_known;

alter table public.bookings add constraint bookings_placement_known check (
  placement in (
    'primary',
    'secondary',
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08'
  )
);

comment on table public.bookings is
  'Sponsorship inventory for the primary slot, the secondary slot, and section spots 01-08. Service role only.';

alter table public.inquiries add column if not exists segment text;
alter table public.inquiries add column if not exists placement text;

alter table public.inquiries drop constraint if exists inquiries_segment_length;
alter table public.inquiries add constraint inquiries_segment_length
  check (segment is null or char_length(segment) between 1 and 40);

alter table public.inquiries drop constraint if exists inquiries_placement_known;
alter table public.inquiries add constraint inquiries_placement_known check (
  placement is null or placement in (
    'primary',
    'secondary',
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08'
  )
);

comment on column public.inquiries.segment is
  'Section slug the inquiry is about. Null on older rows and when the admin leaves it blank.';

comment on column public.inquiries.placement is
  'Rendered slot: primary, secondary, or a section spot 01-08. Null when omitted.';

commit;
