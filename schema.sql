-- HomeServer demo store — Supabase setup
-- Run this once in the Supabase SQL editor (free tier is fine).
-- It creates the catalog, the two order tables, the server-side price
-- trigger, and demo-only access policies. See README for the full story.

-- 1. Catalog. Real prices, publicly readable. The page shows these;
--    the bug is not that prices are secret, it's that the server
--    believes the client's total.
create table if not exists products (
  id    text primary key,
  name  text not null,
  spec  text not null,
  price numeric(10,2) not null
);

insert into products (id, name, spec, price) values
  ('rtx4090',  'RTX 4090 24GB',       '24GB VRAM. For rendering.',              1599.00),
  ('teslap40', 'Tesla P40 24GB (used)','24GB VRAM. No video output. For servers.', 199.00),
  ('rpi5',     'Raspberry Pi 5 8GB',  'Coordinates.',                             80.00),
  ('nvme4tb',  '4TB NVMe Gen4 SSD',   'Weights are heavy.',                     299.00),
  ('ddr5kit',  '128GB DDR5 ECC kit',  'Insufficient, always.',                  449.00),
  ('psu1600',  '1600W Titanium PSU',  'The 4090 is thirsty.',                   329.00)
on conflict (id) do nothing;

-- 2. The two order tables. Identical shapes.
--    orders_vuln: accepts whatever total the browser sends.
--    orders:     the trigger re-checks the total against the catalog.
create table if not exists orders_vuln (
  id         uuid primary key default gen_random_uuid(),
  customer   text not null,
  email      text not null,
  items      jsonb not null,          -- [{id, qty}, ...]
  total      numeric(10,2) not null,  -- claimed by the browser
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id         uuid primary key default gen_random_uuid(),
  customer   text not null,
  email      text not null,
  items      jsonb not null,
  total      numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- 3. The server-side check. This runs inside Postgres, where the
--    browser cannot reach it. Any total that doesn't match the real
--    catalog price x quantity is rejected and nothing is written.
create or replace function enforce_real_price() returns trigger as $$
declare
  real_total numeric(10,2);
begin
  select coalesce(sum(p.price * (item->>'qty')::int), 0)
    into real_total
  from jsonb_array_elements(new.items) as item
  join products p on p.id = item->>'id';

  if real_total = 0 then
    raise exception 'unknown product in order';
  end if;

  if new.total <> real_total then
    raise exception 'price mismatch: claimed %, actual %', new.total, real_total;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_price_check on orders;
create trigger orders_price_check
  before insert on orders
  for each row execute function enforce_real_price();

-- 4. Access policies. DELIBERATELY PERMISSIVE — this is a teaching demo,
--    not a production store. In production you would never allow open
--    inserts like this; the trigger stands in for real server logic.
alter table products    enable row level security;
alter table orders_vuln enable row level security;
alter table orders      enable row level security;

drop policy if exists "public read products" on products;
create policy "public read products"
  on products for select using (true);

drop policy if exists "demo insert vuln" on orders_vuln;
create policy "demo insert vuln"
  on orders_vuln for insert with check (true);

drop policy if exists "demo read vuln" on orders_vuln;
create policy "demo read vuln"
  on orders_vuln for select using (true);

drop policy if exists "demo insert safe" on orders;
create policy "demo insert safe"
  on orders for insert with check (true);

drop policy if exists "demo read safe" on orders;
create policy "demo read safe"
  on orders for select using (true);
