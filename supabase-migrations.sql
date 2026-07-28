-- ============================================================
-- Pure Eight — Full Database Schema
-- Run this entire file in your Supabase SQL Editor
-- Project: rrsvqlouywgtkhcdqknk
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ────────────────────────────────────────────────────────────
-- 1. TENANTS  (HQ = type:'hq', Franchisees = type:'franchisee')
-- ────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  type          text not null check (type in ('hq','franchisee')),
  parent_id     uuid references public.tenants(id),
  logo_url      text,
  settings      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- ────────────────────────────────────────────────────────────
-- 2. OUTLETS  (physical locations)
-- ────────────────────────────────────────────────────────────
create table if not exists public.outlets (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id),
  name          text not null,
  address       text,
  city          text,
  state         text,
  country       text not null default 'IN',
  pincode       text,
  latitude      numeric(10,7),
  longitude     numeric(10,7),
  timezone      text not null default 'Asia/Kolkata',
  phone         text,
  email         text,
  opening_hours jsonb not null default '{}',
  status        text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists outlets_tenant_id_idx on public.outlets(tenant_id) where deleted_at is null;

-- ────────────────────────────────────────────────────────────
-- 3. ROLES
-- ────────────────────────────────────────────────────────────
create table if not exists public.roles (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id),
  name          text not null,
  permissions   jsonb not null default '{}',
  is_system     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists roles_tenant_name_idx on public.roles(tenant_id, name);

-- ────────────────────────────────────────────────────────────
-- 4. USERS  (mirrors auth.users)
-- ────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  mobile        text,
  avatar_url    text,
  mfa_enabled   boolean not null default false,
  status        text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 5. MEMBERSHIPS  (user → tenant + outlet + role)
-- ────────────────────────────────────────────────────────────
create table if not exists public.memberships (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  outlet_id     uuid references public.outlets(id) on delete cascade,
  role_id       uuid not null references public.roles(id),
  is_primary    boolean not null default false,
  invited_at    timestamptz,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists memberships_user_id_idx   on public.memberships(user_id);
create index if not exists memberships_tenant_id_idx on public.memberships(tenant_id);
create index if not exists memberships_outlet_id_idx on public.memberships(outlet_id);

-- ────────────────────────────────────────────────────────────
-- 6. CUSTOMERS  (brand-wide, not per-outlet)
-- ────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id                     uuid primary key default uuid_generate_v4(),
  brand_id               uuid not null references public.tenants(id),
  full_name              text not null,
  mobile                 text not null,
  email                  text,
  dob                    date,
  anniversary            date,
  gender                 text check (gender in ('male','female','other','prefer_not_to_say')),
  tags                   text[] not null default '{}',
  consent_marketing      boolean not null default false,
  notes                  text,
  last_visited_outlet_id uuid references public.outlets(id),
  loyalty_tier           text not null default 'standard' check (loyalty_tier in ('standard','silver','gold','platinum')),
  loyalty_points         integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  unique (brand_id, mobile)
);

create index if not exists customers_brand_id_idx on public.customers(brand_id) where deleted_at is null;
create index if not exists customers_mobile_idx   on public.customers using gin (mobile gin_trgm_ops);
create index if not exists customers_name_idx     on public.customers using gin (full_name gin_trgm_ops);

-- ────────────────────────────────────────────────────────────
-- 7. SERVICES  (brand catalogue, HQ-owned)
-- ────────────────────────────────────────────────────────────
create table if not exists public.services (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid not null references public.tenants(id),
  category      text not null,
  name          text not null,
  description   text,
  duration_mins integer not null default 30,
  price         integer not null default 0,
  currency      text not null default 'INR',
  hsn_code      text,
  tax_rate      numeric(5,2) not null default 18.00,
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists services_brand_id_idx on public.services(brand_id) where deleted_at is null;

-- ────────────────────────────────────────────────────────────
-- 8. STAFF  (per outlet)
-- ────────────────────────────────────────────────────────────
create table if not exists public.staff (
  id                uuid primary key default uuid_generate_v4(),
  outlet_id         uuid not null references public.outlets(id),
  user_id           uuid references public.users(id),
  full_name         text not null,
  mobile            text,
  role_title        text,
  skills            text[] not null default '{}',
  commission_scheme jsonb not null default '{}',
  employment_type   text not null default 'full_time' check (employment_type in ('full_time','part_time','contract')),
  status            text not null default 'active' check (status in ('active','inactive','on_leave')),
  joining_date      date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists staff_outlet_id_idx on public.staff(outlet_id) where deleted_at is null;

-- ────────────────────────────────────────────────────────────
-- 9. APPOINTMENTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id             uuid primary key default uuid_generate_v4(),
  outlet_id      uuid not null references public.outlets(id),
  customer_id    uuid references public.customers(id),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         text not null default 'pending'
                   check (status in ('pending','confirmed','checked_in','in_service','completed','no_show','cancelled')),
  cancel_reason  text,
  notes          text,
  source         text not null default 'manual' check (source in ('manual','online','walkin','campaign')),
  created_by     uuid references public.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create index if not exists appointments_outlet_starts_idx on public.appointments(outlet_id, starts_at) where deleted_at is null;
create index if not exists appointments_customer_idx      on public.appointments(customer_id) where deleted_at is null;

create table if not exists public.appointment_items (
  id             uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id     uuid not null references public.services(id),
  staff_id       uuid references public.staff(id),
  duration_mins  integer not null,
  price          integer not null,
  status         text not null default 'pending'
);

-- ────────────────────────────────────────────────────────────
-- 10. BILLS
-- ────────────────────────────────────────────────────────────
create table if not exists public.bills (
  id               uuid primary key default uuid_generate_v4(),
  outlet_id        uuid not null references public.outlets(id),
  customer_id      uuid references public.customers(id),
  appointment_id   uuid references public.appointments(id),
  bill_number      text not null,
  status           text not null default 'open'
                     check (status in ('open','parked','closed','refunded','cancelled','void')),
  subtotal         integer not null default 0,
  discount_value   integer not null default 0,
  tax_value        integer not null default 0,
  tip_value        integer not null default 0,
  total            integer not null default 0,
  currency         text not null default 'INR',
  notes            text,
  created_by       uuid references public.users(id),
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index if not exists bills_outlet_created_idx on public.bills(outlet_id, created_at desc) where deleted_at is null;
create index if not exists bills_customer_idx       on public.bills(customer_id) where deleted_at is null;
create unique index if not exists bills_number_idx  on public.bills(outlet_id, bill_number);

create table if not exists public.bill_lines (
  id             uuid primary key default uuid_generate_v4(),
  bill_id        uuid not null references public.bills(id) on delete cascade,
  item_type      text not null check (item_type in ('service','product','package','voucher','wallet_redemption')),
  item_id        uuid,
  item_name      text not null,
  staff_id       uuid references public.staff(id),
  qty            integer not null default 1,
  unit_price     integer not null,
  discount_pct   numeric(5,2) not null default 0,
  discount_value integer not null default 0,
  tax_pct        numeric(5,2) not null default 0,
  tax_value      integer not null default 0,
  line_total     integer not null
);

create table if not exists public.bill_payments (
  id           uuid primary key default uuid_generate_v4(),
  bill_id      uuid not null references public.bills(id) on delete cascade,
  mode         text not null check (mode in ('cash','card','upi','wallet','bank_transfer','prepaid_wallet','gift_voucher','loyalty_points')),
  amount       integer not null,
  reference    text,
  captured_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 11. LOYALTY TRANSACTIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.loyalty_txns (
  id            uuid primary key default uuid_generate_v4(),
  customer_id   uuid not null references public.customers(id),
  brand_id      uuid not null references public.tenants(id),
  bill_id       uuid references public.bills(id),
  type          text not null check (type in ('earn','redeem','expire','adjust','bonus')),
  points        integer not null,
  balance_after integer not null,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists loyalty_customer_idx on public.loyalty_txns(customer_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 12. LEADS
-- ────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                    uuid primary key default uuid_generate_v4(),
  outlet_id             uuid not null references public.outlets(id),
  full_name             text not null,
  mobile                text not null,
  source                text not null default 'manual'
                          check (source in ('manual','walkin','website','social','ad_campaign','referral')),
  description           text,
  expected_service      text,
  status                text not null default 'new'
                          check (status in ('new','contacted','hold','follow_up','not_converted','converted')),
  assigned_staff_id     uuid references public.staff(id),
  follow_up_at          timestamptz,
  converted_customer_id uuid references public.customers(id),
  converted_at          timestamptz,
  created_by            uuid references public.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index if not exists leads_outlet_status_idx on public.leads(outlet_id, status) where deleted_at is null;

-- ────────────────────────────────────────────────────────────
-- 13. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  body        text,
  entity_type text,
  entity_id   uuid,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 14. AUDIT LOG  (append-only)
-- ────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id           uuid primary key default uuid_generate_v4(),
  actor_id     uuid references public.users(id),
  tenant_id    uuid references public.tenants(id),
  outlet_id    uuid references public.outlets(id),
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  before_state jsonb,
  after_state  jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_tenant_idx on public.audit_log(tenant_id, created_at desc);
create index if not exists audit_log_actor_idx  on public.audit_log(actor_id, created_at desc);

-- ============================================================
-- AUTO-UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tenants_updated_at   before update on public.tenants   for each row execute function public.set_updated_at();
create trigger outlets_updated_at   before update on public.outlets   for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger services_updated_at  before update on public.services  for each row execute function public.set_updated_at();
create trigger staff_updated_at     before update on public.staff     for each row execute function public.set_updated_at();
create trigger bills_updated_at     before update on public.bills     for each row execute function public.set_updated_at();
create trigger leads_updated_at     before update on public.leads     for each row execute function public.set_updated_at();

-- ============================================================
-- JWT CLAIM HELPERS  (public schema — no auth schema perms needed)
-- ============================================================
create or replace function public.jwt_tenant_id() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
$$ language sql stable security definer;

create or replace function public.jwt_outlet_id() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'outlet_id', '')::uuid;
$$ language sql stable security definer;

create or replace function public.jwt_role() returns text as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'role';
$$ language sql stable security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ── TENANTS ──────────────────────────────────────────────────
alter table public.tenants enable row level security;
create policy "tenants_select" on public.tenants for select using (
  id = public.jwt_tenant_id()
  or parent_id = public.jwt_tenant_id()
  or public.jwt_role() in ('franchisor_admin','hq_manager')
);
create policy "tenants_insert_hq" on public.tenants for insert with check (
  public.jwt_role() = 'franchisor_admin'
);
create policy "tenants_update_hq" on public.tenants for update using (
  public.jwt_role() = 'franchisor_admin'
);

-- ── OUTLETS ──────────────────────────────────────────────────
alter table public.outlets enable row level security;
create policy "outlets_select" on public.outlets for select using (
  tenant_id = public.jwt_tenant_id()
  or public.jwt_role() in ('franchisor_admin','hq_manager','regional_manager')
  or id = public.jwt_outlet_id()
);
create policy "outlets_insert" on public.outlets for insert with check (
  tenant_id = public.jwt_tenant_id() or public.jwt_role() = 'franchisor_admin'
);
create policy "outlets_update" on public.outlets for update using (
  tenant_id = public.jwt_tenant_id() or public.jwt_role() = 'franchisor_admin'
);

-- ── ROLES ────────────────────────────────────────────────────
alter table public.roles enable row level security;
create policy "roles_select" on public.roles for select using (
  tenant_id = public.jwt_tenant_id()
  or public.jwt_role() in ('franchisor_admin','hq_manager')
);

-- ── USERS ────────────────────────────────────────────────────
alter table public.users enable row level security;
create policy "users_select_own"  on public.users for select using (id = auth.uid());
create policy "users_update_own"  on public.users for update using (id = auth.uid());
create policy "users_insert_self" on public.users for insert with check (id = auth.uid());

-- ── MEMBERSHIPS ───────────────────────────────────────────────
alter table public.memberships enable row level security;
create policy "memberships_select" on public.memberships for select using (
  user_id = auth.uid()
  or tenant_id = public.jwt_tenant_id()
  or public.jwt_role() in ('franchisor_admin','hq_manager')
);

-- ── CUSTOMERS ─────────────────────────────────────────────────
alter table public.customers enable row level security;
create policy "customers_select" on public.customers for select using (
  brand_id = public.jwt_tenant_id()
  or exists (select 1 from public.tenants t where t.id = public.jwt_tenant_id() and t.parent_id = customers.brand_id)
);
create policy "customers_insert" on public.customers for insert with check (
  brand_id = public.jwt_tenant_id()
  or exists (select 1 from public.tenants t where t.id = public.jwt_tenant_id() and t.parent_id = customers.brand_id)
);
create policy "customers_update" on public.customers for update using (
  brand_id = public.jwt_tenant_id()
  or exists (select 1 from public.tenants t where t.id = public.jwt_tenant_id() and t.parent_id = customers.brand_id)
);

-- ── SERVICES ─────────────────────────────────────────────────
alter table public.services enable row level security;
create policy "services_select" on public.services for select using (
  brand_id = public.jwt_tenant_id()
  or exists (select 1 from public.tenants t where t.id = public.jwt_tenant_id() and t.parent_id = services.brand_id)
);
create policy "services_mutate_hq" on public.services for all using (
  public.jwt_role() in ('franchisor_admin','hq_manager')
);

-- ── STAFF ────────────────────────────────────────────────────
alter table public.staff enable row level security;
create policy "staff_select" on public.staff for select using (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = staff.outlet_id and o.tenant_id = public.jwt_tenant_id())
  or public.jwt_role() in ('franchisor_admin','hq_manager','regional_manager')
);
create policy "staff_mutate" on public.staff for all using (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = staff.outlet_id and o.tenant_id = public.jwt_tenant_id())
);

-- ── APPOINTMENTS ─────────────────────────────────────────────
alter table public.appointments enable row level security;
create policy "appointments_select" on public.appointments for select using (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = appointments.outlet_id and o.tenant_id = public.jwt_tenant_id())
  or public.jwt_role() in ('franchisor_admin','hq_manager','regional_manager')
);
create policy "appointments_mutate" on public.appointments for all using (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = appointments.outlet_id and o.tenant_id = public.jwt_tenant_id())
);

alter table public.appointment_items enable row level security;
create policy "appt_items_via_appt" on public.appointment_items for all using (
  exists (
    select 1 from public.appointments a where a.id = appointment_items.appointment_id
    and (a.outlet_id = public.jwt_outlet_id()
      or exists (select 1 from public.outlets o where o.id = a.outlet_id and o.tenant_id = public.jwt_tenant_id()))
  )
);

-- ── BILLS ────────────────────────────────────────────────────
alter table public.bills enable row level security;
create policy "bills_select" on public.bills for select using (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = bills.outlet_id and o.tenant_id = public.jwt_tenant_id())
  or public.jwt_role() in ('franchisor_admin','hq_manager')
);
create policy "bills_insert" on public.bills for insert with check (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = outlet_id and o.tenant_id = public.jwt_tenant_id())
);
create policy "bills_update" on public.bills for update using (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = bills.outlet_id and o.tenant_id = public.jwt_tenant_id())
);

alter table public.bill_lines enable row level security;
create policy "bill_lines_via_bill" on public.bill_lines for all using (
  exists (
    select 1 from public.bills b where b.id = bill_lines.bill_id
    and (b.outlet_id = public.jwt_outlet_id()
      or exists (select 1 from public.outlets o where o.id = b.outlet_id and o.tenant_id = public.jwt_tenant_id()))
  )
);

alter table public.bill_payments enable row level security;
create policy "bill_payments_via_bill" on public.bill_payments for all using (
  exists (
    select 1 from public.bills b where b.id = bill_payments.bill_id
    and (b.outlet_id = public.jwt_outlet_id()
      or exists (select 1 from public.outlets o where o.id = b.outlet_id and o.tenant_id = public.jwt_tenant_id()))
  )
);

-- ── LOYALTY ──────────────────────────────────────────────────
alter table public.loyalty_txns enable row level security;
create policy "loyalty_select" on public.loyalty_txns for select using (
  brand_id = public.jwt_tenant_id()
  or exists (select 1 from public.tenants t where t.id = public.jwt_tenant_id() and t.parent_id = loyalty_txns.brand_id)
);

-- ── LEADS ────────────────────────────────────────────────────
alter table public.leads enable row level security;
create policy "leads_select" on public.leads for select using (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = leads.outlet_id and o.tenant_id = public.jwt_tenant_id())
  or public.jwt_role() in ('franchisor_admin','hq_manager')
);
create policy "leads_mutate" on public.leads for all using (
  outlet_id = public.jwt_outlet_id()
  or exists (select 1 from public.outlets o where o.id = leads.outlet_id and o.tenant_id = public.jwt_tenant_id())
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
alter table public.notifications enable row level security;
create policy "notifications_own" on public.notifications for all using (user_id = auth.uid());

-- ── AUDIT LOG ─────────────────────────────────────────────────
alter table public.audit_log enable row level security;
create policy "audit_log_insert" on public.audit_log for insert with check (true);
create policy "audit_log_select" on public.audit_log for select using (
  tenant_id = public.jwt_tenant_id()
  or public.jwt_role() in ('franchisor_admin','hq_manager')
);

-- ============================================================
-- CUSTOM JWT CLAIMS HOOK
-- Register this in: Dashboard → Authentication → Hooks
--   → Custom Access Token Hook → select "set_custom_claims"
-- ============================================================
create or replace function public.set_custom_claims(event jsonb)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id   uuid := (event ->> 'user_id')::uuid;
  v_mem       record;
begin
  select m.tenant_id, m.outlet_id, r.name as role_name
  into v_mem
  from public.memberships m
  join public.roles r on r.id = m.role_id
  where m.user_id = v_user_id and m.is_primary = true
  limit 1;

  if found then
    return jsonb_build_object(
      'tenant_id', v_mem.tenant_id,
      'outlet_id', v_mem.outlet_id,
      'role',      v_mem.role_name
    );
  end if;
  return '{}';
end;
$$;

-- ============================================================
-- DEMO SEED DATA
-- Creates: 1 HQ tenant, 1 franchisee, 1 outlet, roles, services
-- ============================================================

-- Insert HQ tenant
insert into public.tenants (id, name, type) values
  ('00000000-0000-0000-0000-000000000001', 'Pure Eight HQ', 'hq')
on conflict do nothing;

-- Insert franchisee tenant
insert into public.tenants (id, name, type, parent_id) values
  ('00000000-0000-0000-0000-000000000002', 'Pure Eight Bandra', 'franchisee', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- Insert outlet
insert into public.outlets (id, tenant_id, name, address, city, state, pincode, phone, email) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002',
   'Pure Eight — Bandra', '14 Linking Road, Bandra West', 'Mumbai', 'Maharashtra', '400050',
   '+91 22 6789 0123', 'bandra@pureeight.com')
on conflict do nothing;

-- Insert system roles for HQ
insert into public.roles (tenant_id, name, is_system, permissions) values
  ('00000000-0000-0000-0000-000000000001', 'franchisor_admin', true, '{"*": true}'),
  ('00000000-0000-0000-0000-000000000001', 'hq_manager', true, '{"dashboard": true, "reports": true, "audits": true}'),
  ('00000000-0000-0000-0000-000000000002', 'franchisee_owner', true, '{"dashboard": true, "pos": true, "appointments": true, "customers": true, "reports": true, "staff": true}'),
  ('00000000-0000-0000-0000-000000000002', 'outlet_manager', true, '{"dashboard": true, "pos": true, "appointments": true, "customers": true, "reports": true}'),
  ('00000000-0000-0000-0000-000000000002', 'staff', true, '{"appointments": true, "customers.read": true}')
on conflict do nothing;

-- Insert services
insert into public.services (brand_id, category, name, duration_mins, price, tax_rate, display_order) values
  ('00000000-0000-0000-0000-000000000001', 'Hair', 'Haircut & Style', 45, 80000, 18, 1),
  ('00000000-0000-0000-0000-000000000001', 'Hair', 'Hair Colour', 90, 250000, 18, 2),
  ('00000000-0000-0000-0000-000000000001', 'Hair', 'Keratin Treatment', 120, 350000, 18, 3),
  ('00000000-0000-0000-0000-000000000001', 'Skin', 'Classic Facial', 60, 120000, 18, 4),
  ('00000000-0000-0000-0000-000000000001', 'Skin', 'Gold Facial', 75, 180000, 18, 5),
  ('00000000-0000-0000-0000-000000000001', 'Skin', 'Microdermabrasion', 45, 220000, 18, 6),
  ('00000000-0000-0000-0000-000000000001', 'Nails', 'Manicure', 30, 60000, 18, 7),
  ('00000000-0000-0000-0000-000000000001', 'Nails', 'Pedicure', 45, 80000, 18, 8),
  ('00000000-0000-0000-0000-000000000001', 'Nails', 'Gel Extensions', 60, 150000, 18, 9),
  ('00000000-0000-0000-0000-000000000001', 'Body', 'Full Body Waxing', 60, 180000, 18, 10),
  ('00000000-0000-0000-0000-000000000001', 'Body', 'Head Massage', 30, 40000, 18, 11),
  ('00000000-0000-0000-0000-000000000001', 'Body', 'Swedish Massage', 60, 200000, 18, 12)
on conflict do nothing;

-- Insert staff
insert into public.staff (outlet_id, full_name, role_title, skills, commission_scheme) values
  ('00000000-0000-0000-0001-000000000001', 'Priya Sharma', 'Senior Stylist', ARRAY['hair','colour','keratin'], '{"type":"percent","value":15}'),
  ('00000000-0000-0000-0001-000000000001', 'Rahul Nair', 'Hair Specialist', ARRAY['hair','colour'], '{"type":"percent","value":12}'),
  ('00000000-0000-0000-0001-000000000001', 'Sakshi Gupta', 'Nail Technician', ARRAY['nails','gel'], '{"type":"percent","value":12}'),
  ('00000000-0000-0000-0001-000000000001', 'Amit Verma', 'Skin Therapist', ARRAY['skin','facial','massage'], '{"type":"percent","value":12}')
on conflict do nothing;

-- ============================================================
-- DONE ✓
-- Next step: Dashboard → Authentication → Hooks
--   → Custom Access Token Hook → public.set_custom_claims
-- ============================================================
