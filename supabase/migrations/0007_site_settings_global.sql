insert into public.site_settings (key, value)
values ('site_public_website_enabled', 'true'), ('site_maintenance_mode', 'false')
on conflict (key) do nothing;
