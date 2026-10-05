-- Per-user settings (Manage PIN hash). Soft parental gate — not high security.
-- Each auth user has their own row; family members do not share PINs.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  manage_pin_hash text,
  manage_pin_length int check (
    manage_pin_length is null
    or (manage_pin_length >= 4 and manage_pin_length <= 6)
  ),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "users can read own settings" on public.user_settings;
create policy "users can read own settings"
  on public.user_settings for select
  to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "users can insert own settings" on public.user_settings;
create policy "users can insert own settings"
  on public.user_settings for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "users can update own settings" on public.user_settings;
create policy "users can update own settings"
  on public.user_settings for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

grant select, insert, update on table public.user_settings to authenticated;

-- Ensure PostgREST can see the table (reload schema cache after running).
notify pgrst, 'reload schema';
