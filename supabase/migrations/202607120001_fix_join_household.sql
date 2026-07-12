create or replace function public.join_household(join_code text)
returns table (household_id uuid, household_name text, invite_code text)
language plpgsql
security definer set search_path = ''
as $$
declare
  selected_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select h.id into selected_id
  from public.households as h
  where h.invite_code = upper(trim(join_code));

  if selected_id is null then raise exception 'Family code not found'; end if;

  insert into public.household_members as hm (household_id, user_id, role)
  values (selected_id, auth.uid(), 'member')
  on conflict on constraint household_members_pkey
  do update set joined_at = now();

  return query
    select h.id, h.name, h.invite_code
    from public.households as h
    where h.id = selected_id;
end;
$$;

grant execute on function public.join_household(text) to authenticated;
