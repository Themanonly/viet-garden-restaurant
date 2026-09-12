create table if not exists public.restaurant_profiles (
  id text primary key,
  name jsonb not null,
  description jsonb not null,
  source_language text not null default 'fr' check (source_language = 'fr'),
  address jsonb not null,
  city text not null,
  postal_code text not null,
  google_maps_url text not null,
  ordering jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_profiles_name_object check (jsonb_typeof(name) = 'object'),
  constraint restaurant_profiles_description_object check (jsonb_typeof(description) = 'object'),
  constraint restaurant_profiles_address_object check (jsonb_typeof(address) = 'object'),
  constraint restaurant_profiles_ordering_array check (jsonb_typeof(ordering) = 'array')
);

create table if not exists public.restaurant_contacts (
  id text primary key,
  profile_id text not null references public.restaurant_profiles (id) on update cascade on delete cascade,
  type text not null check (type in ('phone', 'whatsapp', 'email', 'fax', 'other')),
  label jsonb not null,
  value text not null,
  display_value text,
  enabled boolean not null default true,
  sort_order integer not null check (sort_order >= 0),
  primary_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_contacts_label_object check (jsonb_typeof(label) = 'object'),
  constraint restaurant_contacts_value_not_empty check (length(trim(value)) > 0),
  unique (profile_id, sort_order)
);

create table if not exists public.restaurant_social_links (
  id text primary key,
  profile_id text not null references public.restaurant_profiles (id) on update cascade on delete cascade,
  platform text not null,
  label jsonb not null,
  url text not null,
  handle text,
  icon text,
  enabled boolean not null default true,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_social_links_platform_not_empty check (length(trim(platform)) > 0),
  constraint restaurant_social_links_label_object check (jsonb_typeof(label) = 'object'),
  constraint restaurant_social_links_url_not_empty check (length(trim(url)) > 0),
  unique (profile_id, sort_order)
);

insert into public.restaurant_profiles (id, name, description, source_language, address, city, postal_code, google_maps_url, ordering)
values (
  'viet-garden-casablanca',
  '{"fr":"Viet Garden Restaurant & Coffee","en":"Viet Garden Restaurant & Coffee","ar":"مطعم ومقهى فييت غاردن"}'::jsonb,
  '{"fr":"Restaurant vietnamien et asiatique à Casablanca, pensé pour les repas en famille, les déjeuners et les soirées conviviales.","en":"Vietnamese and Asian restaurant in Casablanca, designed for family meals, relaxed lunches, and convivial evenings.","ar":"مطعم فيتنامي وآسيوي في الدار البيضاء، مصمم لوجبات العائلة والغداء الهادئ والأمسيات الودية."}'::jsonb,
  'fr',
  '{"fr":"80 Bd Moulay Slimane, Casablanca 20250","en":"80 Bd Moulay Slimane, Casablanca 20250","ar":"80 شارع مولاي سليمان، الدار البيضاء 20250"}'::jsonb,
  'Casablanca',
  '20250',
  'https://www.google.com/maps/place/VIET+GARDEN+RESTAURANT+%26+COFEE/@33.6098413,-7.5647156,17z',
  '[{"label":{"fr":"Commander sur Glovo","en":"Order on Glovo","ar":"اطلب عبر Glovo"},"url":"https://glovoapp.com/ma/fr/casablanca/viet-garden-cas","source":"glovo"}]'::jsonb
)
on conflict (id) do nothing;

insert into public.restaurant_contacts (id, profile_id, type, label, value, display_value, enabled, sort_order, primary_flag)
values ('main', 'viet-garden-casablanca', 'phone', '{"fr":"Réservations","en":"Reservations","ar":"الحجوزات"}'::jsonb, '+212522666773', '05 22 66 67 73', true, 0, true)
on conflict (id) do nothing;

insert into public.restaurant_social_links (id, profile_id, platform, label, url, enabled, sort_order)
values
  ('instagram', 'viet-garden-casablanca', 'instagram', '{"fr":"Instagram","en":"Instagram","ar":"Instagram"}'::jsonb, 'https://www.instagram.com/viet_garden_restaurant/', true, 0),
  ('facebook', 'viet-garden-casablanca', 'facebook', '{"fr":"Facebook","en":"Facebook","ar":"Facebook"}'::jsonb, 'https://www.facebook.com/vietgardenofficiel/', true, 1)
on conflict (id) do nothing;

grant all on table public.restaurant_profiles to service_role;
grant all on table public.restaurant_contacts to service_role;
grant all on table public.restaurant_social_links to service_role;
alter table public.restaurant_profiles enable row level security;
alter table public.restaurant_contacts enable row level security;
alter table public.restaurant_social_links enable row level security;
revoke all on table public.restaurant_profiles from anon, authenticated;
revoke all on table public.restaurant_contacts from anon, authenticated;
revoke all on table public.restaurant_social_links from anon, authenticated;

create view public.public_restaurant_profile as
select p.id, p.name, p.description, p.source_language, p.address, p.city, p.postal_code, p.google_maps_url, p.ordering,
       coalesce((select jsonb_agg(c order by c.sort_order) from public.restaurant_contacts c where c.profile_id = p.id and c.enabled), '[]'::jsonb) as contacts,
       coalesce((select jsonb_agg(s order by s.sort_order) from public.restaurant_social_links s where s.profile_id = p.id and s.enabled), '[]'::jsonb) as social_links
from public.restaurant_profiles p
where p.id = 'viet-garden-casablanca';

grant select on public.public_restaurant_profile to anon, authenticated;
revoke all on table public.public_restaurant_profile from public;
