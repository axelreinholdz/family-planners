-- Family Planners — Supabase schema
-- Run in Supabase SQL Editor (or via supabase db push).

create extension if not exists "pgcrypto";

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Familjen',
  invite_code text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'parent' check (role in ('parent', 'member')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- One JSON snapshot per family (mirrors current IndexedDB FamilyData shape).
create table public.family_data (
  family_id uuid primary key references public.families (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index family_members_user_id_idx on public.family_members (user_id);
create index families_invite_code_idx on public.families (invite_code);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_data enable row level security;

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members m
    where m.family_id = fid
      and m.user_id = auth.uid()
  );
$$;

create policy "members can read family"
  on public.families for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_family_member(id)
  );

create policy "authenticated can create family"
  on public.families for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "members can update family"
  on public.families for update
  to authenticated
  using (public.is_family_member(id));

create policy "members can read memberships"
  on public.family_members for select
  to authenticated
  using (public.is_family_member(family_id) or user_id = auth.uid());

create policy "user can join as self"
  on public.family_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "members can read family data"
  on public.family_data for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "members can insert family data"
  on public.family_data for insert
  to authenticated
  with check (public.is_family_member(family_id));

create policy "members can update family data"
  on public.family_data for update
  to authenticated
  using (public.is_family_member(family_id));

-- Allow looking up a family by invite code to join (limited columns via RPC).
create or replace function public.join_family(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into fid
  from public.families
  where invite_code = upper(trim(code))
  limit 1;

  if fid is null then
    raise exception 'Ogiltig inbjudningskod';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (fid, auth.uid(), 'parent')
  on conflict do nothing;

  return fid;
end;
$$;

grant execute on function public.join_family(text) to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;
