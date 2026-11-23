-- SwachhSeva: add community-reported severity to new and existing reports.
alter table public.reports
  add column if not exists severity text not null default 'medium'
  check (severity in ('low','medium','high'));

-- Add severity to the public-safe view without exposing private report fields.
create or replace view public.public_reports as
select id, category, description, location_text, latitude, longitude, status, created_at, severity
from public.reports
where status in ('approved','acknowledged','resolved');

grant select on public.public_reports to anon, authenticated;
