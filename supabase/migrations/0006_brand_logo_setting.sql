create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
revoke all on table public.site_settings from anon, authenticated;

grant all on table public.site_settings to service_role;

insert into public.site_settings (key, value)
values ('brand_logo_media_id', 'brand-logo')
on conflict (key) do nothing;

update public.media
set reference_url = '/media/viet-garden-logo.png', source = 'brand', updated_at = now()
where id = 'brand-logo' and reference_url = '/media/brand-logo.svg';
