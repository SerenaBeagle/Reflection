alter table public.diary_entries enable row level security;

create policy "Users can view their own diary entries"
on public.diary_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own diary entries"
on public.diary_entries
for insert
to authenticated
with check (auth.uid() = user_id);
