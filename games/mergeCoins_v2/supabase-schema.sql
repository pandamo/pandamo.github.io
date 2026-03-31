create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.game_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bottles jsonb not null default '[]'::jsonb,
  max_face_value integer not null default 1,
  max_record integer not null default 1,
  bottle_count integer not null default 2,
  is_game_over boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles
  for select
  using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users can read own game save" on public.game_saves;
create policy "users can read own game save"
  on public.game_saves
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can insert own game save" on public.game_saves;
create policy "users can insert own game save"
  on public.game_saves
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can update own game save" on public.game_saves;
create policy "users can update own game save"
  on public.game_saves
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete own game save" on public.game_saves;
create policy "users can delete own game save"
  on public.game_saves
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace view public.leaderboard_entries as
select
  p.display_name,
  gs.max_record,
  gs.updated_at
from public.game_saves gs
join public.profiles p on p.id = gs.user_id;

grant select on public.leaderboard_entries to anon, authenticated;




