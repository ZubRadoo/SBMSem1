-- SwachhSeva: Patna authority routing and severity-based publication.
-- Apply this migration once in the Supabase SQL Editor.

alter table public.reports
  add column if not exists severity text not null default 'medium',
  add column if not exists authority_keys text[] not null default '{}',
  add column if not exists email_status text not null default 'not_requested',
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text;

alter table public.reports
  drop constraint if exists reports_severity_check;
alter table public.reports
  add constraint reports_severity_check
  check (severity in ('low', 'medium', 'high'));

alter table public.reports
  drop constraint if exists reports_email_status_check;
alter table public.reports
  add constraint reports_email_status_check
  check (email_status in ('not_requested','sent','failed','not_configured','portal_only'));

create or replace function public.set_report_publication_status()
returns trigger
language plpgsql
as $$
begin
  if new.severity in ('low', 'medium') then
    new.status := 'approved';
    new.reviewed_at := now();
  else
    new.status := 'pending_review';
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_set_publication_status on public.reports;
create trigger reports_set_publication_status
before insert on public.reports
for each row execute function public.set_report_publication_status();

-- The trigger determines the status. The insert policy permits only the
-- exact status/severity combinations produced by that trigger.
drop policy if exists "anonymous can submit reports" on public.reports;
create policy "anonymous can submit reports" on public.reports
for insert to anon, authenticated
with check (
  (severity in ('low','medium') and status = 'approved')
  or (severity = 'high' and status = 'pending_review')
);

-- Preserve private reports: only faculty can read/update them.
