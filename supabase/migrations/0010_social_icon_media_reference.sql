alter table public.restaurant_social_links
  add column if not exists icon_media_id text references public.media(id) on update cascade on delete set null;

grant all on table public.restaurant_social_links to service_role;
