alter table public.media drop constraint if exists media_storage_key_shape;
alter table public.media add constraint media_storage_key_shape check (storage_key is null or storage_key ~ '^uploads/[a-f0-9-]+\.(jpg|png|gif|webp|mp4)$');
