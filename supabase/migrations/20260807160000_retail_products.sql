-- Retail products.
--
-- Products are inventory items that are also sold over the counter, rather than
-- a separate catalogue: the same bottle can be consumed during a service and
-- sold to a customer, and modelling it once keeps a single stock figure,
-- purchase-order history and movement ledger for it.
--
-- inventory_items already carried cost_price (what we pay). Selling needs what
-- the customer pays and the tax on it, plus a flag for whether the item appears
-- at the till at all — most consumables should not.
--
-- Money is stored in paise, matching services.price and bills.total.

alter table public.inventory_items
  add column if not exists sale_price integer not null default 0,
  add column if not exists tax_rate   numeric(5,2) not null default 0,
  add column if not exists is_retail  boolean not null default false;

comment on column public.inventory_items.sale_price is
  'Retail price charged to the customer, in paise. 0 when the item is not sold.';
comment on column public.inventory_items.tax_rate is
  'GST percentage applied at the till, e.g. 18.00.';
comment on column public.inventory_items.is_retail is
  'Whether the item is offered for sale in Quick Sale. Consumables stay false.';

-- Only retail items are listed at the till, so index for that lookup.
create index if not exists inventory_items_retail_idx
  on public.inventory_items (brand_id)
  where is_retail and deleted_at is null;
