create table if not exists public.household_member_aliases (
  household_id uuid not null references public.households(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null check (char_length(trim(alias)) between 1 and 40),
  updated_at timestamptz not null default now(),
  primary key (household_id, owner_user_id, target_user_id)
);

alter table public.household_member_aliases enable row level security;

create policy "users manage their own family aliases" on public.household_member_aliases
  for all to authenticated
  using (owner_user_id = (select auth.uid()) and public.is_household_member(household_id))
  with check (
    owner_user_id = (select auth.uid())
    and public.is_household_member(household_id)
    and exists (
      select 1 from public.household_members hm
      where hm.household_id = household_member_aliases.household_id
        and hm.user_id = household_member_aliases.target_user_id
    )
  );

grant select, insert, update, delete on public.household_member_aliases to authenticated;

create or replace function public.set_household_member_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_household uuid;
begin
  if new_role not in ('owner', 'adult', 'member') then
    raise exception 'Invalid family role';
  end if;

  select hm.household_id into selected_household
  from public.household_members hm
  where hm.user_id = (select auth.uid()) and hm.role = 'owner'
  limit 1;

  if selected_household is null then raise exception 'Only the family owner can change roles'; end if;
  if target_user = (select auth.uid()) then raise exception 'The owner cannot change their own role'; end if;

  update public.household_members
  set role = new_role
  where household_id = selected_household and user_id = target_user;

  if not found then raise exception 'Family member not found'; end if;
end;
$$;

grant execute on function public.set_household_member_role(uuid, text) to authenticated;
