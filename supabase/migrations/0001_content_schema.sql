create table if not exists public.content_revisions (
  id text primary key,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

insert into public.content_revisions (id, revision)
values ('default', 0)
on conflict (id) do nothing;

create table if not exists public.menu_categories (
  id text primary key,
  name jsonb not null,
  description jsonb,
  active boolean not null default true,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_categories_name_object check (jsonb_typeof(name) = 'object'),
  constraint menu_categories_name_fr check (jsonb_typeof(name -> 'fr') = 'string' and length(trim(name ->> 'fr')) > 0),
  constraint menu_categories_name_en check (jsonb_typeof(name -> 'en') = 'string' and length(trim(name ->> 'en')) > 0),
  constraint menu_categories_name_ar check (jsonb_typeof(name -> 'ar') = 'string' and length(trim(name ->> 'ar')) > 0),
  constraint menu_categories_description_object check (description is null or jsonb_typeof(description) = 'object')
);

create unique index if not exists menu_categories_sort_order_key on public.menu_categories (sort_order);

create table if not exists public.media (
  id text primary key,
  type text not null check (type in ('image', 'video')),
  source text not null check (source in ('local', 'remote', 'brand')),
  storage_bucket text,
  storage_key text,
  reference_url text not null,
  alt jsonb not null,
  visible boolean not null default true,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_alt_object check (jsonb_typeof(alt) = 'object'),
  constraint media_storage_identity check ((storage_bucket is null and storage_key is null) or (storage_bucket is not null and storage_key is not null)),
  constraint media_storage_key_shape check (storage_key is null or storage_key ~ '^uploads/[a-f0-9-]+\\.(jpg|png|gif|webp|mp4)$')
);

create unique index if not exists media_storage_object_key on public.media (storage_bucket, storage_key) where storage_key is not null;
create unique index if not exists media_sort_order_key on public.media (sort_order);

create table if not exists public.menu_items (
  id text primary key,
  category_id text not null references public.menu_categories (id) on update cascade on delete restrict,
  name jsonb not null,
  description jsonb not null,
  price_amount numeric(10, 2) not null check (price_amount >= 0),
  price_currency text not null default 'MAD' check (price_currency = 'MAD'),
  media_id text references public.media (id) on update cascade on delete restrict,
  active boolean not null default true,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_name_object check (jsonb_typeof(name) = 'object'),
  constraint menu_items_name_fr check (jsonb_typeof(name -> 'fr') = 'string' and length(trim(name ->> 'fr')) > 0),
  constraint menu_items_name_en check (jsonb_typeof(name -> 'en') = 'string' and length(trim(name ->> 'en')) > 0),
  constraint menu_items_name_ar check (jsonb_typeof(name -> 'ar') = 'string' and length(trim(name ->> 'ar')) > 0),
  constraint menu_items_description_object check (jsonb_typeof(description) = 'object')
);

create unique index if not exists menu_items_category_sort_order_key on public.menu_items (category_id, sort_order);
create index if not exists menu_items_category_id_idx on public.menu_items (category_id);
create index if not exists menu_items_media_id_idx on public.menu_items (media_id);

create table if not exists public.featured_sections (
  id text primary key,
  title jsonb not null,
  description jsonb,
  active boolean not null default true,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint featured_sections_title_object check (jsonb_typeof(title) = 'object'),
  constraint featured_sections_title_fr check (jsonb_typeof(title -> 'fr') = 'string' and length(trim(title ->> 'fr')) > 0),
  constraint featured_sections_title_en check (jsonb_typeof(title -> 'en') = 'string' and length(trim(title ->> 'en')) > 0),
  constraint featured_sections_title_ar check (jsonb_typeof(title -> 'ar') = 'string' and length(trim(title ->> 'ar')) > 0),
  constraint featured_sections_description_object check (description is null or jsonb_typeof(description) = 'object')
);

create unique index if not exists featured_sections_sort_order_key on public.featured_sections (sort_order);

create table if not exists public.featured_section_items (
  featured_section_id text not null references public.featured_sections (id) on update cascade on delete cascade,
  menu_item_id text not null references public.menu_items (id) on update cascade on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  primary key (featured_section_id, menu_item_id),
  unique (featured_section_id, sort_order)
);

create index if not exists featured_section_items_menu_item_id_idx on public.featured_section_items (menu_item_id);

create table if not exists public.restaurant_availability (
  id text primary key,
  status text not null check (status in ('open', 'closed')),
  manual_override text not null check (manual_override in ('none', 'open', 'closed')),
  temporary_closure_active boolean not null default false,
  temporary_closure_message jsonb not null,
  status_message jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_availability_closure_message_object check (jsonb_typeof(temporary_closure_message) = 'object'),
  constraint restaurant_availability_status_message_object check (jsonb_typeof(status_message) = 'object')
);

create table if not exists public.restaurant_availability_periods (
  id bigint generated always as identity primary key,
  availability_id text not null references public.restaurant_availability (id) on update cascade on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  sort_order integer not null check (sort_order >= 0),
  opens_at time not null,
  closes_at time not null,
  constraint restaurant_availability_periods_order check (opens_at < closes_at),
  unique (availability_id, weekday, sort_order)
);

create index if not exists restaurant_availability_periods_lookup_idx on public.restaurant_availability_periods (availability_id, weekday, sort_order);

create or replace function public.replace_menu_document(payload jsonb, expected_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_revision bigint;
  next_revision bigint;
  category_row jsonb;
  item_row jsonb;
  section_row jsonb;
  weekday_key text;
  weekday_number integer;
  period_row jsonb;
  period_sort_order integer;
begin
  select revision into current_revision
  from public.content_revisions
  where id = 'default'
  for update;

  if current_revision is null then
    raise exception 'content_revision_missing';
  end if;
  if current_revision <> expected_revision then
    raise exception 'content_revision_conflict';
  end if;

  delete from public.featured_section_items where true;
  delete from public.featured_sections where true;
  delete from public.menu_items where true;
  delete from public.menu_categories where true;
  delete from public.restaurant_availability_periods where true;
  delete from public.restaurant_availability where true;

  for category_row in select value from jsonb_array_elements(payload -> 'categories') loop
    insert into public.menu_categories (id, name, description, active, sort_order)
    values (
      category_row ->> 'id',
      category_row -> 'name',
      category_row -> 'description',
      coalesce((category_row ->> 'active')::boolean, true),
      (category_row ->> 'sortOrder')::integer
    );
  end loop;

  for item_row in select value from jsonb_array_elements(payload -> 'items') loop
    insert into public.menu_items (id, category_id, name, description, price_amount, price_currency, media_id, active, sort_order)
    values (
      item_row ->> 'id',
      item_row ->> 'categoryId',
      item_row -> 'name',
      item_row -> 'description',
      (item_row -> 'price' ->> 'amount')::numeric(10, 2),
      item_row -> 'price' ->> 'currency',
      item_row ->> 'mediaId',
      coalesce((item_row ->> 'active')::boolean, true),
      (item_row ->> 'sortOrder')::integer
    );
  end loop;

  for section_row in select value from jsonb_array_elements(payload -> 'featuredSections') loop
    insert into public.featured_sections (id, title, description, active, sort_order)
    values (
      section_row ->> 'id',
      section_row -> 'title',
      section_row -> 'description',
      coalesce((section_row ->> 'active')::boolean, true),
      (section_row ->> 'sortOrder')::integer
    );
    insert into public.featured_section_items (featured_section_id, menu_item_id, sort_order)
    select section_row ->> 'id', value, row_number() over () - 1
    from jsonb_array_elements_text(section_row -> 'itemIds');
  end loop;

  insert into public.restaurant_availability (id, status, manual_override, temporary_closure_active, temporary_closure_message, status_message)
  values (
    'default',
    payload -> 'availability' ->> 'status',
    payload -> 'availability' ->> 'manualOverride',
    coalesce((payload -> 'availability' -> 'temporaryClosure' ->> 'active')::boolean, false),
    payload -> 'availability' -> 'temporaryClosure' -> 'message',
    payload -> 'availability' -> 'statusMessage'
  );

  for weekday_key, weekday_number in
    select * from jsonb_each_text('{"monday":0,"tuesday":1,"wednesday":2,"thursday":3,"friday":4,"saturday":5,"sunday":6}'::jsonb)
  loop
    period_sort_order := 0;
    for period_row in select value from jsonb_array_elements(payload -> 'availability' -> 'schedule' -> weekday_key) loop
      insert into public.restaurant_availability_periods (availability_id, weekday, sort_order, opens_at, closes_at)
      values ('default', weekday_number, period_sort_order, (period_row ->> 'opensAt')::time, (period_row ->> 'closesAt')::time);
      period_sort_order := period_sort_order + 1;
    end loop;
  end loop;

  next_revision := current_revision + 1;
  update public.content_revisions set revision = next_revision, updated_at = now() where id = 'default';
  return next_revision;
end;
$$;

revoke all on function public.replace_menu_document(jsonb, bigint) from public, anon, authenticated;
grant execute on function public.replace_menu_document(jsonb, bigint) to service_role;

grant all on table public.content_revisions to service_role;
grant all on table public.menu_categories to service_role;
grant all on table public.menu_items to service_role;
grant all on table public.featured_sections to service_role;
grant all on table public.featured_section_items to service_role;
grant all on table public.restaurant_availability to service_role;
grant all on table public.restaurant_availability_periods to service_role;
grant all on table public.media to service_role;
grant usage, select on all sequences in schema public to service_role;
