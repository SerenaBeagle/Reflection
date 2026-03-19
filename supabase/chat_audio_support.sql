alter table public.messages
  add column if not exists audio_url text,
  add column if not exists audio_duration_seconds integer,
  add column if not exists transcript text,
  add column if not exists message_kind text not null default 'text';

insert into storage.buckets (id, name, public)
values ('chat-audio', 'chat-audio', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Chat audio is publicly viewable" on storage.objects;
create policy "Chat audio is publicly viewable"
on storage.objects
for select
to public
using (bucket_id = 'chat-audio');

drop policy if exists "Users can upload their own chat audio" on storage.objects;
create policy "Users can upload their own chat audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own chat audio" on storage.objects;
create policy "Users can update their own chat audio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own chat audio" on storage.objects;
create policy "Users can delete their own chat audio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
