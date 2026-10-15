-- Additive migration: never changes products, orders, or orders_vuln.
-- Run in the Supabase SQL editor after schema.sql.
create table if not exists public.backoffice_sessions (
  id uuid primary key,
  version bigint not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.backoffice_sessions enable row level security;
revoke all on public.backoffice_sessions from public, anon, authenticated;
grant all on public.backoffice_sessions to service_role;

-- A versioned aggregate keeps cursor advancement, event receipts, invoice
-- issuance, and mode changes in the same atomic write. CAS losers retry.
create or replace function public.backoffice_load(p_id uuid, p_initial jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare result jsonb;
begin
  insert into public.backoffice_sessions(id, state) values(p_id, p_initial)
    on conflict(id) do nothing;
  select jsonb_build_object('version', version, 'state', state) into result
    from public.backoffice_sessions where id = p_id;
  return result;
end;
$$;
create or replace function public.backoffice_cas(p_id uuid, p_version bigint, p_state jsonb)
returns boolean language plpgsql set search_path = '' as $$
begin
  update public.backoffice_sessions set state = p_state, version = version + 1, updated_at = now()
    where id = p_id and version = p_version;
  return found;
end;
$$;
revoke all on function public.backoffice_load(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.backoffice_cas(uuid,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.backoffice_load(uuid,jsonb) to service_role;
grant execute on function public.backoffice_cas(uuid,bigint,jsonb) to service_role;

-- Readable rows for backstage SQL inspection; API snapshots use the aggregate.
create or replace view public.backoffice_orders with (security_invoker = true) as
select s.id as demo_id, s.state->>'generation' as generation,
  o->>'id' as id, o->'items' as items, (o->>'total')::numeric as total,
  o->>'state' as state,
  to_timestamp((o->>'paid_at')::double precision / 1000.0) as paid_at,
  to_timestamp((o->>'fulfilled_at')::double precision / 1000.0) as fulfilled_at,
  o->>'fulfilled_by' as fulfilled_by, o->>'webhook_event_id' as webhook_event_id,
  o->>'invoice' as invoice
from public.backoffice_sessions s cross join lateral jsonb_array_elements(s.state->'orders') o;
create or replace view public.backoffice_events with (security_invoker = true) as
select s.id as demo_id, e as event
from public.backoffice_sessions s cross join lateral jsonb_array_elements(s.state->'events') e;
revoke all on public.backoffice_orders, public.backoffice_events from public, anon, authenticated;
-- Supabase default privileges may grant service_role more than SELECT.
revoke all on public.backoffice_orders, public.backoffice_events from service_role;
grant select on public.backoffice_orders, public.backoffice_events to service_role;
