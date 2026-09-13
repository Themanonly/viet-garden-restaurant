create or replace function public.replace_restaurant_locations(p_profile_id text, p_locations jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
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
    from jsonb_array_elements(p_locations) as payload_row
    where payload_row ->> 'profile_id' is distinct from p_profile_id
  ) then
    raise exception 'Replacement locations must belong to this profile';
  end if;

    select count(*) filter (where (payload_row ->> 'enabled')::boolean), count(*) filter (where (payload_row ->> 'is_primary')::boolean)
  into enabled_count, primary_count
  from jsonb_array_elements(p_locations) as payload_row;

  if enabled_count > 0 and primary_count <> 1 then
    raise exception 'Exactly one enabled location must be primary';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_locations) as payload_row
    where coalesce((payload_row ->> 'enabled')::boolean, false) = false
      and coalesce((payload_row ->> 'is_primary')::boolean, false) = true
  ) then
    raise exception 'A disabled location cannot be primary';
  end if;

  delete from public.restaurant_locations where profile_id = p_profile_id;

  insert into public.restaurant_locations (id, profile_id, name, address, city, postal_code, google_maps_url, is_primary, enabled, sort_order)
  select
    payload_row ->> 'id',
    payload_row ->> 'profile_id',
    payload_row -> 'name',
    payload_row -> 'address',
    payload_row ->> 'city',
    payload_row ->> 'postal_code',
    nullif(payload_row ->> 'google_maps_url', ''),
    coalesce((payload_row ->> 'is_primary')::boolean, false),
    coalesce((payload_row ->> 'enabled')::boolean, true),
    (payload_row ->> 'sort_order')::integer
  from jsonb_array_elements(p_locations) as payload_row;
end;
$$;

revoke all on function public.replace_restaurant_locations(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_restaurant_locations(text, jsonb) to service_role;
