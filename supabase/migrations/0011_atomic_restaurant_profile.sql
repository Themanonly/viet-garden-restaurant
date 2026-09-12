-- One PostgreSQL transaction for the entire profile replacement. Any constraint
-- failure rolls back the profile, contact and Social changes together.
create or replace function public.replace_restaurant_profile(p_profile jsonb, p_contacts jsonb, p_socials jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profile_id text := p_profile->>'id';
begin
  if v_profile_id is distinct from 'viet-garden-casablanca'
     or jsonb_typeof(p_contacts) is distinct from 'array'
     or jsonb_typeof(p_socials) is distinct from 'array' then
    raise exception 'Invalid restaurant profile replacement';
  end if;
  perform 1 from public.restaurant_profiles where id = v_profile_id for update;
  if not found then raise exception 'Restaurant profile not found'; end if;
  if exists (select 1 from jsonb_array_elements(p_contacts || p_socials) r where r->>'profile_id' is distinct from v_profile_id) then
    raise exception 'Replacement records must belong to this profile';
  end if;
  update public.restaurant_profiles set
    name = p_profile->'name', description = p_profile->'description',
    source_language = p_profile->>'source_language', address = p_profile->'address',
    city = p_profile->>'city', postal_code = p_profile->>'postal_code',
    google_maps_url = p_profile->>'google_maps_url', ordering = p_profile->'ordering'
  where id = v_profile_id;
  delete from public.restaurant_contacts c where c.profile_id = v_profile_id;
  delete from public.restaurant_social_links s where s.profile_id = v_profile_id;
  insert into public.restaurant_contacts (id, profile_id, type, label, value, display_value, enabled, sort_order, primary_flag)
    select r.id, r.profile_id, r.type, r.label, r.value, r.display_value, r.enabled, r.sort_order, r.primary_flag
    from jsonb_populate_recordset(null::public.restaurant_contacts, p_contacts) r;
  insert into public.restaurant_social_links (id, profile_id, platform, label, url, handle, icon, icon_media_id, enabled, sort_order)
    select r.id, r.profile_id, r.platform, r.label, r.url, r.handle, r.icon, r.icon_media_id, r.enabled, r.sort_order
    from jsonb_populate_recordset(null::public.restaurant_social_links, p_socials) r;
end;
$$;
revoke all on function public.replace_restaurant_profile(jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.replace_restaurant_profile(jsonb,jsonb,jsonb) to service_role;

