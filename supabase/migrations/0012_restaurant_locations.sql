create table if not exists public.restaurant_locations (
  id text primary key,
  profile_id text not null references public.restaurant_profiles (id) on update cascade on delete cascade,
  name jsonb not null,
  address jsonb not null,
  city text not null,
  postal_code text not null,
  google_maps_url text,
  is_primary boolean not null default false,
  enabled boolean not null default true,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_locations_name_object check (jsonb_typeof(name) = 'object'),
  constraint restaurant_locations_address_object check (jsonb_typeof(address) = 'object'),
  constraint restaurant_locations_city_not_empty check (length(trim(city)) > 0),
  constraint restaurant_locations_postal_code_not_empty check (length(trim(postal_code)) > 0),
  constraint restaurant_locations_maps_url_valid check (google_maps_url is null or google_maps_url ~* '^https?://'),
  constraint restaurant_locations_disabled_not_primary check (enabled or not is_primary),
  constraint restaurant_locations_enabled_name_translations check (
    not enabled
    or (
      jsonb_typeof(name -> 'fr') = 'string' and length(trim(name ->> 'fr')) > 0
      and jsonb_typeof(name -> 'en') = 'string' and length(trim(name ->> 'en')) > 0
      and jsonb_typeof(name -> 'ar') = 'string' and length(trim(name ->> 'ar')) > 0
    )
  ),
  constraint restaurant_locations_enabled_address_translations check (
    not enabled
    or (
      jsonb_typeof(address -> 'fr') = 'string' and length(trim(address ->> 'fr')) > 0
      and jsonb_typeof(address -> 'en') = 'string' and length(trim(address ->> 'en')) > 0
      and jsonb_typeof(address -> 'ar') = 'string' and length(trim(address ->> 'ar')) > 0
    )
  )
);

create unique index if not exists restaurant_locations_primary_key
  on public.restaurant_locations (profile_id)
  where is_primary;

create index if not exists restaurant_locations_profile_enabled_order_idx
  on public.restaurant_locations (profile_id, enabled, sort_order, id);

alter table public.restaurant_locations enable row level security;
revoke all on table public.restaurant_locations from anon, authenticated;
grant all on table public.restaurant_locations to service_role;

do $$
begin
  if exists (select 1 from public.restaurant_profiles where id = 'viet-garden-casablanca') then
    insert into public.restaurant_locations (
      id, profile_id, name, address, city, postal_code, google_maps_url, is_primary, enabled, sort_order
    )
    select
      'location-viet-garden-casablanca', id, name, address, city, postal_code, nullif(google_maps_url, ''), true, true, 0
    from public.restaurant_profiles
    where id = 'viet-garden-casablanca'
    on conflict (id) do nothing;
  end if;
end;
$$;

create or replace function public.replace_restaurant_locations(p_profile_id text, p_locations jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  location_row jsonb;
  enabled_count integer;
  primary_count integer;
begin
  if p_profile_id is distinct from 'viet-garden-casablanca' or jsonb_typeof(p_locations) is distinct from 'array' then
    raise exception 'Invalid restaurant location replacement';
  end if;

  perform 1 from public.restaurant_profiles where id = p_profile_id for update;
  if not found then raise exception 'Restaurant profile not found'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_locations) location_row
    where location_row ->> 'profile_id' is distinct from p_profile_id
  ) then
    raise exception 'Replacement locations must belong to this profile';
  end if;

  select count(*) filter (where (location_row ->> 'enabled')::boolean), count(*) filter (where (location_row ->> 'is_primary')::boolean)
  into enabled_count, primary_count
  from jsonb_array_elements(p_locations) location_row;

  if enabled_count > 0 and primary_count <> 1 then
    raise exception 'Exactly one enabled location must be primary';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_locations) location_row
    where coalesce((location_row ->> 'enabled')::boolean, false) = false
      and coalesce((location_row ->> 'is_primary')::boolean, false) = true
  ) then
    raise exception 'A disabled location cannot be primary';
  end if;

  delete from public.restaurant_locations where profile_id = p_profile_id;

  insert into public.restaurant_locations (id, profile_id, name, address, city, postal_code, google_maps_url, is_primary, enabled, sort_order)
  select
    location_row ->> 'id',
    location_row ->> 'profile_id',
    location_row -> 'name',
    location_row -> 'address',
    location_row ->> 'city',
    location_row ->> 'postal_code',
    nullif(location_row ->> 'google_maps_url', ''),
    coalesce((location_row ->> 'is_primary')::boolean, false),
    coalesce((location_row ->> 'enabled')::boolean, true),
    (location_row ->> 'sort_order')::integer
  from jsonb_array_elements(p_locations) location_row;
end;
$$;

revoke all on function public.replace_restaurant_locations(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_restaurant_locations(text, jsonb) to service_role;
