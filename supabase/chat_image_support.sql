alter table public.messages
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Chat images are publicly viewable" on storage.objects;
create policy "Chat images are publicly viewable"
on storage.objects
for select
to public
using (bucket_id = 'chat-images');

drop policy if exists "Users can upload their own chat images" on storage.objects;
create policy "Users can upload their own chat images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own chat images" on storage.objects;
create policy "Users can update their own chat images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own chat images" on storage.objects;
create policy "Users can delete their own chat images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
