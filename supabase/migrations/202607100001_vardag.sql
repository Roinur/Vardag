create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My family',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.vardag_records (
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('entries', 'tasks', 'events', 'shopping_items', 'food_logs', 'food_decisions')),
  record_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, entity_type, record_id)
);

create index if not exists household_members_user_id_idx on public.household_members(user_id);
create index if not exists vardag_records_household_idx on public.vardag_records(household_id, entity_type);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household and user_id = (select auth.uid())
  );
$$;

create or replace function public.ensure_household()
returns table (household_id uuid, household_name text, invite_code text)
language plpgsql
security definer set search_path = ''
as $$
declare
  selected_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select hm.household_id into selected_id
  from public.household_members hm
  where hm.user_id = auth.uid()
  order by hm.joined_at desc
  limit 1;

  if selected_id is null then
    insert into public.households (created_by) values (auth.uid()) returning id into selected_id;
    insert into public.household_members (household_id, user_id, role)
    values (selected_id, auth.uid(), 'owner');
  end if;

  return query
    select h.id, h.name, h.invite_code from public.households h where h.id = selected_id;
end;
$$;

create or replace function public.join_household(join_code text)
returns table (household_id uuid, household_name text, invite_code text)
language plpgsql
security definer set search_path = ''
as $$
declare
  selected_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select h.id into selected_id from public.households h where h.invite_code = upper(trim(join_code));
  if selected_id is null then raise exception 'Family code not found'; end if;

  insert into public.household_members (household_id, user_id, role)
  values (selected_id, auth.uid(), 'member')
  on conflict on constraint household_members_pkey do update set joined_at = now();

  return query
    select h.id, h.name, h.invite_code from public.households h where h.id = selected_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.vardag_records enable row level security;

create policy "profiles readable by signed in users" on public.profiles
  for select to authenticated using (true);
create policy "profile owners can update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "members can read household" on public.households
  for select to authenticated using ((select public.is_household_member(id)));
create policy "members can read membership" on public.household_members
  for select to authenticated using ((select public.is_household_member(household_id)));
create policy "members can read records" on public.vardag_records
  for select to authenticated using ((select public.is_household_member(household_id)));
create policy "members can insert records" on public.vardag_records
  for insert to authenticated with check ((select public.is_household_member(household_id)) and owner_id = (select auth.uid()));
create policy "members can update records" on public.vardag_records
  for update to authenticated using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));
create policy "members can delete records" on public.vardag_records
  for delete to authenticated using ((select public.is_household_member(household_id)));

grant select, update on public.profiles to authenticated;
grant select on public.households, public.household_members to authenticated;
grant select, insert, update, delete on public.vardag_records to authenticated;
grant execute on function public.ensure_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.vardag_records;
exception when duplicate_object then null;
end $$;
