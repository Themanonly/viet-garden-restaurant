insert into public.site_settings (key, value)
values (
  'homepage_content',
  '{"heroEyebrow":{"fr":"Cuisine vietnamienne · Casablanca","en":"Vietnamese cuisine · Casablanca","ar":"مطبخ فيتنامي · الدار البيضاء"},"heroStatement":{"fr":"Une cuisine vietnamienne et asiatique à Casablanca.","en":"Vietnamese and Asian cuisine in Casablanca.","ar":"مطبخ فيتنامي وآسيوي في الدار البيضاء."},"identityEyebrow":{"fr":"L’expérience Viet Garden","en":"The Viet Garden experience","ar":"تجربة فييت غاردن"},"identityTitle":{"fr":"Une table vietnamienne à Casablanca","en":"A Vietnamese table in Casablanca","ar":"مائدة فيتنامية في الدار البيضاء"}}'
)
on conflict (key) do nothing;
