create table if not exists public.promotions (
  id text primary key,
  title jsonb not null,
  description jsonb not null,
  type text not null check (type in ('percentage', 'fixed-amount', 'buy-x-get-y-free', 'buy-x-get-y-discount', 'bundle-fixed-price')),
  target jsonb not null,
  rule jsonb not null,
  enabled boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null check (sort_order >= 0),
  media_id text references public.media (id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_title_object check (jsonb_typeof(title) = 'object'),
  constraint promotions_description_object check (jsonb_typeof(description) = 'object'),
  constraint promotions_target_object check (jsonb_typeof(target) = 'object'),
  constraint promotions_rule_object check (jsonb_typeof(rule) = 'object'),
  constraint promotions_dates_valid check (ends_at is null or starts_at is null or starts_at <= ends_at),
  unique (sort_order)
);

grant all on table public.promotions to service_role;
alter table public.promotions enable row level security;
revoke all on table public.promotions from anon, authenticated;
create view public.public_promotions as
select id, title, description, type, target, rule, sort_order, media_id
from public.promotions
where enabled = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now());
grant select on public.public_promotions to anon, authenticated;
revoke all on table public.public_promotions from public;
