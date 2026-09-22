-- Asset management.
--
-- Equipment and fixtures an outlet owns and keeps — styling chairs, dryers,
-- straighteners, air-conditioning, POS tablets — as distinct from inventory,
-- which is stock that gets used up or sold. An asset is one physical thing
-- tracked across its life: bought, serviced, repaired, depreciated, disposed of.
--
-- Money is in paise, matching bills.total and inventory_items.cost_price.

create table if not exists public.assets (
  id                     uuid primary key default gen_random_uuid(),
  brand_id               uuid not null references public.tenants(id),
  -- Null for equipment held at head office rather than at a branch.
  outlet_id              uuid references public.outlets(id),

  name                   text not null,
  category               text not null default 'equipment',
  asset_tag              text,
  serial_number          text,
  location               text,

  vendor_id              uuid references public.vendors(id),
  purchase_date          date,
  purchase_cost          integer not null default 0 check (purchase_cost >= 0),
  invoice_ref            text,
  warranty_expiry        date,

  -- Straight-line depreciation down to salvage_value over useful_life_months.
  useful_life_months     integer not null default 60 check (useful_life_months > 0),
  salvage_value          integer not null default 0 check (salvage_value >= 0),

  status                 text not null default 'in_use'
                           check (status in ('in_use','under_repair','idle','retired','disposed')),
  condition              text not null default 'good'
                           check (condition in ('excellent','good','fair','poor')),

  -- When set, the next service falls due this many days after the last one.
  service_interval_days  integer check (service_interval_days is null or service_interval_days > 0),

  disposed_on            date,
  disposal_value         integer check (disposal_value is null or disposal_value >= 0),
  notes                  text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,

  constraint assets_salvage_within_cost check (salvage_value <= purchase_cost),
  constraint assets_disposal_consistent
    check ((status = 'disposed') = (disposed_on is not null))
);

-- A tag identifies one asset within a brand; deleted rows release theirs.
create unique index if not exists assets_brand_tag_idx
  on public.assets (brand_id, asset_tag)
  where asset_tag is not null and deleted_at is null;

create index if not exists assets_scope_idx
  on public.assets (brand_id, outlet_id)
  where deleted_at is null;

create table if not exists public.asset_maintenance (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references public.assets(id) on delete cascade,
  type          text not null check (type in ('service','repair','inspection')),
  performed_on  date not null,
  cost          integer not null default 0 check (cost >= 0),
  vendor_id     uuid references public.vendors(id),
  description   text,
  -- Explicit next date, overriding service_interval_days when the technician
  -- names one.
  next_due      date,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists asset_maintenance_asset_idx
  on public.asset_maintenance (asset_id, performed_on desc);

-- Row level security, matching the rest of this database: the app reaches
-- these tables only through the service role on the server, so that is the
-- only role granted access. Browser clients using the anon or authenticated
-- keys see nothing.
alter table public.assets            enable row level security;
alter table public.asset_maintenance enable row level security;

create policy "service_role_all_assets"
  on public.assets for all to service_role using (true) with check (true);

create policy "service_role_all_asset_maintenance"
  on public.asset_maintenance for all to service_role using (true) with check (true);
