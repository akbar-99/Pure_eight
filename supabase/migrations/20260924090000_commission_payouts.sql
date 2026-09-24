-- Commission payouts.
--
-- Reports could say what a staff member had earned but not whether they had
-- been paid it, so "is this person's commission cleared?" had no answer in the
-- system. A payout records a payment made to one staff member for one period.
--
-- The amount is stored rather than derived. What was handed over is a fact and
-- must not move afterwards: bills can be amended or voided after payday, and a
-- recomputed figure would quietly rewrite history and make the books disagree
-- with the cash that actually left the till.
--
-- Several payouts may cover the same period. That is deliberate — an advance
-- part way through the month, then the balance at the end, is normal, and a
-- correction can be recorded without deleting anything. What is owed is the
-- commission earned less the sum of what has been paid.

create table if not exists public.commission_payouts (
  id          uuid primary key default uuid_generate_v4(),
  staff_id    uuid not null references public.staff(id),
  outlet_id   uuid not null references public.outlets(id),
  -- The period the payment covers, inclusive, in IST calendar days.
  period_from date not null,
  period_to   date not null,
  -- Paise, as everywhere else in this schema.
  amount      integer not null check (amount > 0),
  mode        text not null check (mode in ('cash','card','upi','wallet','bank_transfer','prepaid_wallet','gift_voucher')),
  notes       text,
  paid_at     timestamptz not null default now(),
  paid_by     uuid references public.users(id),
  created_at  timestamptz not null default now(),
  -- Soft delete: a payout recorded by mistake is withdrawn, not erased, so the
  -- correction stays visible in the audit trail.
  deleted_at  timestamptz,
  constraint commission_payouts_period_order check (period_to >= period_from)
);

create index if not exists commission_payouts_staff_idx
  on public.commission_payouts (staff_id, period_from desc) where deleted_at is null;

create index if not exists commission_payouts_outlet_idx
  on public.commission_payouts (outlet_id, paid_at desc) where deleted_at is null;

-- Row level security, matching the rest of this database: the app reaches this
-- table only through the service role on the server, so that is the only role
-- granted access. Browser clients using the anon or authenticated keys see
-- nothing.
alter table public.commission_payouts enable row level security;

create policy "service_role_all_commission_payouts"
  on public.commission_payouts for all to service_role using (true) with check (true);
