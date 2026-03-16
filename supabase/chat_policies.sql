alter table public.chat_threads enable row level security;
alter table public.messages enable row level security;

create policy "Users can view their own chat threads"
on public.chat_threads
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own chat threads"
on public.chat_threads
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own chat threads"
on public.chat_threads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can view their own messages"
on public.messages
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own messages"
on public.messages
for insert
to authenticated
with check (auth.uid() = user_id);
