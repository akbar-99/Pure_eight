-- Fixed salary.
--
-- Staff records carried a commission rate but no salary, so anyone paid a set
-- amount each month — a receptionist, a manager, a cleaner — had no pay in the
-- system at all. Commission and salary are independent: someone may have one,
-- the other, or both, and a manager on a small percentage as well as a salary
-- is ordinary.

alter table public.staff
  add column if not exists monthly_salary integer not null default 0;

comment on column public.staff.monthly_salary is
  'Fixed pay per month in paise. 0 means this person is not on a salary.';

alter table public.staff drop constraint if exists staff_monthly_salary_check;
alter table public.staff add constraint staff_monthly_salary_check check (monthly_salary >= 0);

-- Payouts now record salary as well as commission, so the name no longer fits.
-- Guarded so the script can be run twice without failing.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'commission_payouts'
  ) then
    alter table public.commission_payouts rename to staff_payouts;
    alter policy "service_role_all_commission_payouts"
      on public.staff_payouts rename to "service_role_all_staff_payouts";
  end if;
end $$;
