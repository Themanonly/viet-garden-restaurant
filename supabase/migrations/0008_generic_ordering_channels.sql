-- Normalize the existing profile ordering JSON into generic channel records.
-- This is additive and preserves the existing Glovo URL, labels, and visibility.
update public.restaurant_profiles
set ordering = coalesce((
  select jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'id', coalesce(item ->> 'id', case when item ->> 'source' = 'glovo' then 'glovo' else 'ordering-' || (ordinality - 1)::text end),
      'name', coalesce(item -> 'name', item -> 'label', '{}'::jsonb),
      'type', coalesce(item ->> 'type', item ->> 'source', 'other'),
      'url', item ->> 'url',
      'logoMediaId', item -> 'logoMediaId',
      'description', item -> 'description',
      'ctaText', coalesce(item -> 'ctaText', item -> 'label'),
      'enabled', coalesce((item ->> 'enabled')::boolean, true),
      'sortOrder', coalesce((item ->> 'sortOrder')::integer, (ordinality - 1)::integer)
    )) order by ordinality
  )
  from jsonb_array_elements(ordering) with ordinality
), '[]'::jsonb)
where jsonb_typeof(ordering) = 'array';

alter table public.restaurant_profiles
  drop constraint if exists restaurant_profiles_ordering_array;

alter table public.restaurant_profiles
  add constraint restaurant_profiles_ordering_channels_array
  check (jsonb_typeof(ordering) = 'array');
