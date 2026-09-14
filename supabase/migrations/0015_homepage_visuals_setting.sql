insert into public.media (
  id,
  type,
  source,
  storage_bucket,
  storage_key,
  reference_url,
  alt,
  visible,
  sort_order
)
select
  'hero-poster',
  'image',
  'local',
  null,
  null,
  '/media/viet-garden-hero-poster.jpg',
  '{"fr":"Viet Garden Restaurant & Coffee Casablanca","en":"Viet Garden Restaurant & Coffee Casablanca","ar":"مطعم ومقهى فييت غاردن الدار البيضاء"}'::jsonb,
  true,
  coalesce(max(sort_order), -1) + 1
from public.media
on conflict (id) do nothing;

insert into public.site_settings (key, value)
values (
  'homepage_visuals',
  '{"heroVisualMediaId":"hero-visual","heroPosterMediaId":"hero-poster","identityVisualMediaId":"identity-visual"}'
)
on conflict (key) do nothing;
