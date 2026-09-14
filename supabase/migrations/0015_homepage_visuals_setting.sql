insert into public.site_settings (key, value)
values (
  'homepage_visuals',
  '{"heroVisualMediaId":"hero-visual","heroPosterMediaId":"hero-poster","identityVisualMediaId":"identity-visual"}'
)
on conflict (key) do nothing;

