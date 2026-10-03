-- Fix: creators could INSERT a family but not SELECT it back (RLS),
-- so createFamily() failed on .select().single().
-- Also add an atomic create_family RPC.

drop policy if exists "members can read family" on public.families;
create policy "members can read family"
  on public.families for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_family_member(id)
  );

create or replace function public.create_family(family_name text default 'Familjen')
returns table (family_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if uid is null then
    raise exception 'Inte inloggad';
  end if;

  -- Generate invite code
  code := '';
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;

  insert into public.families (name, invite_code, created_by)
  values (coalesce(nullif(trim(family_name), ''), 'Familjen'), code, uid)
  returning id into fid;

  insert into public.family_members (family_id, user_id, role)
  values (fid, uid, 'parent');

  insert into public.family_data (family_id, payload, updated_by)
  values (fid, '{}'::jsonb, uid);

  family_id := fid;
  invite_code := code;
  return next;
end;
$$;

grant execute on function public.create_family(text) to authenticated;
