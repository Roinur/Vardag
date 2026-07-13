alter table public.vardag_records add column if not exists deleted_at timestamptz;
alter table public.vardag_records add column if not exists client_updated_at timestamptz;

update public.vardag_records
set client_updated_at = coalesce(client_updated_at, updated_at, now())
where client_updated_at is null;

alter table public.vardag_records alter column client_updated_at set default now();
alter table public.vardag_records alter column client_updated_at set not null;
create index if not exists vardag_records_client_updated_idx on public.vardag_records(household_id, client_updated_at);

create or replace function public.touch_vardag_client_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.client_updated_at = old.client_updated_at then
    new.client_updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists touch_vardag_client_timestamp on public.vardag_records;
create trigger touch_vardag_client_timestamp
before update on public.vardag_records
for each row execute function public.touch_vardag_client_timestamp();

create or replace function public.apply_vardag_mutation(
  p_household_id uuid,
  p_entity_type text,
  p_record_id text,
  p_owner_id uuid,
  p_payload jsonb,
  p_client_updated_at timestamptz,
  p_deleted boolean default false
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  existing public.vardag_records%rowtype;
  result_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_entity_type not in ('entries', 'tasks', 'events', 'shopping_items', 'food_logs', 'food_decisions') then
    raise exception 'Unsupported record type';
  end if;
  if not public.is_household_member(p_household_id) then raise exception 'Not a household member'; end if;

  select * into existing
  from public.vardag_records
  where household_id = p_household_id and entity_type = p_entity_type and record_id = p_record_id
  for update;

  if found then
    if p_client_updated_at <= existing.client_updated_at then return existing.payload; end if;
    if p_owner_id is not null and p_owner_id <> existing.owner_id then raise exception 'Record owner cannot be changed'; end if;
    if not (
      existing.owner_id = auth.uid()
      or (
        coalesce(existing.payload ->> 'scope', 'family') = 'family'
        and cardinality(public.vardag_record_recipients(existing.payload)) = 0
      )
    ) then raise exception 'Mutation not allowed'; end if;

    update public.vardag_records
    set payload = case when p_deleted then existing.payload else coalesce(p_payload, existing.payload) end,
        deleted_at = case when p_deleted then p_client_updated_at else null end,
        client_updated_at = p_client_updated_at,
        updated_at = now()
    where household_id = p_household_id and entity_type = p_entity_type and record_id = p_record_id
    returning payload into result_payload;
    return result_payload;
  end if;

  if p_deleted then return null; end if;
  if p_owner_id is null or p_owner_id <> auth.uid() then raise exception 'New records must be owned by the creator'; end if;
  if p_payload is null then raise exception 'Payload required'; end if;

  insert into public.vardag_records (
    household_id, owner_id, entity_type, record_id, payload, client_updated_at, deleted_at, updated_at
  ) values (
    p_household_id, p_owner_id, p_entity_type, p_record_id, p_payload, p_client_updated_at, null, now()
  ) returning payload into result_payload;
  return result_payload;
end;
$$;

grant execute on function public.apply_vardag_mutation(uuid, text, text, uuid, jsonb, timestamptz, boolean) to authenticated;

create or replace function public.apply_vardag_completion(
  p_household_id uuid,
  p_entity_type text,
  p_record_id text,
  p_completed boolean,
  p_client_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  existing public.vardag_records%rowtype;
  result_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_entity_type not in ('tasks', 'shopping_items', 'events') then raise exception 'Unsupported record type'; end if;

  select * into existing
  from public.vardag_records
  where household_id = p_household_id and entity_type = p_entity_type and record_id = p_record_id
  for update;

  if not found then return null; end if;
  if not public.can_read_vardag_record(existing.household_id, existing.owner_id, existing.payload) then
    raise exception 'Completion not allowed';
  end if;
  if existing.deleted_at is not null or p_client_updated_at <= existing.client_updated_at then return existing.payload; end if;

  update public.vardag_records
  set payload = case p_entity_type
      when 'tasks' then jsonb_set(existing.payload, '{status}', to_jsonb(case when p_completed then 'done' else 'todo' end::text), true)
      when 'shopping_items' then jsonb_set(existing.payload, '{isBought}', to_jsonb(p_completed), true)
      when 'events' then jsonb_set(existing.payload, '{isCompleted}', to_jsonb(p_completed), true)
    end,
    client_updated_at = p_client_updated_at,
    updated_at = now()
  where household_id = p_household_id and entity_type = p_entity_type and record_id = p_record_id
  returning payload into result_payload;
  return result_payload;
end;
$$;

grant execute on function public.apply_vardag_completion(uuid, text, text, boolean, timestamptz) to authenticated;
