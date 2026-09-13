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
  if p_profile_id is null or length(trim(p_profile_id)) = 0 or jsonb_typeof(p_locations) is distinct from 'array' then
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
