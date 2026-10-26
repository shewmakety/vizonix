-- Belt and braces: these tables are server-only (service_role). RLS is already enabled and forced
-- with no policies; also make sure the browser roles hold no table privileges at all.
revoke all on table public.sponsors from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.inquiries from anon, authenticated;
revoke all on table public.subscriber_prefs from anon, authenticated;
revoke all on table public.topic_suggestions from anon, authenticated;

-- Keep Supabase's default privileges from granting future tables to the browser roles.
-- Remove these two lines if you plan to expose new tables through the Data API on purpose.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
