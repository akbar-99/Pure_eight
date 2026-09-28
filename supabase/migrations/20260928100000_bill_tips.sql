-- Who a tip was left for.
--
-- A tip was only ever a single number on the bill, so every report worked out
-- the split at read time by dividing it between whoever happened to be on the
-- bill. That meant a tip could never be given to one person, and editing a bill
-- afterwards silently rewrote what each member of staff had been shown earning.
--
-- The share is now decided at the counter and written down. Bills raised before
-- this have no rows here and are still split evenly, as they always were.

create table if not exists public.bill_tips (
  id         uuid primary key default uuid_generate_v4(),
  bill_id    uuid not null references public.bills(id) on delete cascade,
  staff_id   uuid not null references public.staff(id),
  -- Paise, as everywhere else in this schema.
  amount     integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  -- One row per person per bill; a second share is added to the first.
  constraint bill_tips_bill_staff_unique unique (bill_id, staff_id)
);

create index if not exists bill_tips_bill_idx  on public.bill_tips (bill_id);
create index if not exists bill_tips_staff_idx on public.bill_tips (staff_id, created_at desc);

-- Row level security, matching the rest of this database: the app reaches this
-- table only through the service role on the server.
alter table public.bill_tips enable row level security;

create policy "service_role_all_bill_tips"
  on public.bill_tips for all to service_role using (true) with check (true);
