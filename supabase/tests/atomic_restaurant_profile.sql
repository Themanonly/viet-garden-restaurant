-- Run after 0011. All successful test mutations are rolled back.
begin;
do $$
declare
  p jsonb; c jsonb; s jsonb; candidate jsonb; after_state jsonb;
begin
  select to_jsonb(r) into p from public.restaurant_profiles r where id='viet-garden-casablanca' for update;
  select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') into c from public.restaurant_contacts r where profile_id=p->>'id';
  select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') into s from public.restaurant_social_links r where profile_id=p->>'id';
  if jsonb_array_length(s)=0 then raise exception 'Existing Social fixture required'; end if;
  candidate := jsonb_set(s, '{0,icon_media_id}', '"step16b-nonexistent-media"');
  begin
    perform public.replace_restaurant_profile(p, '[]', candidate);
    raise exception 'Expected a foreign-key violation';
  exception when foreign_key_violation then null;
  end;
  select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') into after_state from public.restaurant_social_links r where profile_id=p->>'id';
  if after_state is distinct from s then raise exception 'Social rows changed after failure'; end if;
  select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') into after_state from public.restaurant_contacts r where profile_id=p->>'id';
  if after_state is distinct from c then raise exception 'Contact rows changed after failure'; end if;
  candidate := jsonb_set(s, '{0,icon_media_id}', '"brand-logo"');
  perform public.replace_restaurant_profile(p, c, candidate);
  if not exists(select 1 from public.restaurant_social_links where id=s->0->>'id' and icon_media_id='brand-logo') then raise exception 'Media reference did not persist'; end if;
  candidate := jsonb_set(candidate, '{0,icon_media_id}', 'null');
  perform public.replace_restaurant_profile(p, c, candidate);
  if not exists(select 1 from public.restaurant_social_links where id=s->0->>'id' and icon_media_id is null) then raise exception 'Media clearing failed'; end if;
end $$;
rollback;
select 'PASS: failed replacement preserved Social and Contacts; media persistence and clearing passed; test changes rolled back' as result;
