-- Store the buyer ad copy on an inquiry.
-- Apply this file in the Supabase SQL editor. The app does not run it.
-- promote stays the short legacy summary. ad_copy holds the full text, up to 1,200 characters.

begin;

alter table public.inquiries add column if not exists ad_copy text;

alter table public.inquiries drop constraint if exists inquiries_ad_copy_length;
alter table public.inquiries add constraint inquiries_ad_copy_length
  check (ad_copy is null or char_length(ad_copy) between 1 and 1200);

comment on column public.inquiries.ad_copy is
  'Full ad copy from the buyer. Company name stays in company. Null on older rows.';

commit;
