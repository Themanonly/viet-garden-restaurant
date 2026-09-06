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
