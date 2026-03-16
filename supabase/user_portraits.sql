create table if not exists public.user_portraits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null check (report_type in ('custom_range', 'monthly')),
  start_date date not null,
  end_date date not null,
  title text not null,
  summary text not null,
  tone text not null default 'gentle',
  source_entry_count integer not null default 0,
  dominant_emotions jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_portraits_date_range_check check (start_date <= end_date)
);

create index if not exists user_portraits_user_id_created_at_idx
  on public.user_portraits (user_id, created_at desc);

create index if not exists user_portraits_user_id_report_type_idx
  on public.user_portraits (user_id, report_type);

create unique index if not exists user_portraits_monthly_unique_idx
  on public.user_portraits (user_id, report_type, start_date, end_date)
  where report_type = 'monthly';

create or replace function public.set_user_portraits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_portraits_updated_at on public.user_portraits;

create trigger set_user_portraits_updated_at
before update on public.user_portraits
for each row
execute function public.set_user_portraits_updated_at();

alter table public.user_portraits enable row level security;

create policy "Users can view their own portraits"
on public.user_portraits
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own portraits"
on public.user_portraits
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own portraits"
on public.user_portraits
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own portraits"
on public.user_portraits
for delete
to authenticated
using (auth.uid() = user_id);
