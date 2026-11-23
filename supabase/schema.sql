-- SwachhSeva initial schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  category text not null check (char_length(category) <= 80),
  description text not null check (char_length(description) between 5 and 700),
  location_text text not null check (char_length(location_text) <= 240),
  latitude double precision,
  longitude double precision,
  photo_path text,
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','acknowledged','resolved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint valid_coordinates check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  )
);

create table if not exists public.faculty_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_by text not null,
  verified_at timestamptz not null default now()
);

alter table public.reports enable row level security;
alter table public.faculty_admins enable row level security;

-- Anonymous visitors can submit. They cannot read or update private submissions.
drop policy if exists "anonymous can submit reports" on public.reports;
create policy "anonymous can submit reports" on public.reports
  for insert to anon, authenticated with check (status = 'pending_review');

-- Faculty reviewer accounts can read and update reports.
drop policy if exists "faculty can read reports" on public.reports;
create policy "faculty can read reports" on public.reports
  for select to authenticated using (
    exists (select 1 from public.faculty_admins f where f.user_id = auth.uid())
  );
drop policy if exists "faculty can update reports" on public.reports;
create policy "faculty can update reports" on public.reports
  for update to authenticated using (
    exists (select 1 from public.faculty_admins f where f.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.faculty_admins f where f.user_id = auth.uid())
  );

-- A restricted view exposes only approved public statuses and safe fields.
create or replace view public.public_reports
with (security_invoker = true) as
select id, category, description, location_text, latitude, longitude, status, created_at
from public.reports
where status in ('approved','acknowledged','resolved');

grant select on public.public_reports to anon, authenticated;
grant insert on public.reports to anon, authenticated;
grant select, update on public.reports to authenticated;

-- Public photo bucket: use non-guessable object names; only approved report paths
-- should be linked from the public map. For stricter privacy, keep bucket private
-- and serve signed URLs from a server-side route instead.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos','report-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "anonymous upload report photos" on storage.objects;
create policy "anonymous upload report photos" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'report-photos');

-- Faculty verification procedure:
-- 1) Create the faculty user's Auth account in Supabase.
-- 2) Obtain that user's UUID from Authentication > Users.
-- 3) Run the following as project owner, replacing values:
-- insert into public.faculty_admins(user_id, verified_by)
-- values ('FACULTY_AUTH_USER_UUID', 'Faculty name / designation');
--
-- Do not give anon users select access to reports or faculty_admins.
