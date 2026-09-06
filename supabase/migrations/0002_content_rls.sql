alter table public.content_revisions enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.featured_sections enable row level security;
alter table public.featured_section_items enable row level security;
alter table public.restaurant_availability enable row level security;
alter table public.restaurant_availability_periods enable row level security;
alter table public.media enable row level security;

revoke all on table public.content_revisions from anon, authenticated;
revoke all on table public.menu_categories from anon, authenticated;
revoke all on table public.menu_items from anon, authenticated;
revoke all on table public.featured_sections from anon, authenticated;
revoke all on table public.featured_section_items from anon, authenticated;
revoke all on table public.restaurant_availability from anon, authenticated;
revoke all on table public.restaurant_availability_periods from anon, authenticated;
revoke all on table public.media from anon, authenticated;

drop view if exists public.public_menu_items;
drop view if exists public.public_featured_sections;
drop view if exists public.public_menu_categories;
drop view if exists public.public_restaurant_availability;
drop view if exists public.public_media;

create view public.public_menu_categories as
select id, name, description, sort_order
from public.menu_categories
where active = true;

create view public.public_menu_items as
select id, category_id, name, description, price_amount, price_currency, media_id, sort_order
from public.menu_items
where active = true;

create view public.public_featured_sections as
select id, title, description, sort_order
from public.featured_sections
where active = true;

create view public.public_media as
select id, type, source, storage_bucket, storage_key, reference_url, alt, sort_order
from public.media
where visible = true;

create view public.public_restaurant_availability as
select a.id, a.status, a.manual_override, a.temporary_closure_active, a.temporary_closure_message, a.status_message,
       p.weekday, p.sort_order as period_sort_order, p.opens_at, p.closes_at
from public.restaurant_availability a
left join public.restaurant_availability_periods p on p.availability_id = a.id;

grant select on public.public_menu_categories to anon, authenticated;
grant select on public.public_menu_items to anon, authenticated;
grant select on public.public_featured_sections to anon, authenticated;
grant select on public.public_media to anon, authenticated;
grant select on public.public_restaurant_availability to anon, authenticated;

revoke all on table public.public_menu_categories from public;
revoke all on table public.public_menu_items from public;
revoke all on table public.public_featured_sections from public;
revoke all on table public.public_media from public;
revoke all on table public.public_restaurant_availability from public;
