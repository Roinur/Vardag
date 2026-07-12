create or replace function public.vardag_record_recipients(payload jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array(
    select distinct recipient
    from (
      select jsonb_array_elements_text(coalesce(payload -> 'assigneeIds', '[]'::jsonb)) as recipient
      union all
      select nullif(payload ->> 'assigneeId', '')
      union all
      select jsonb_array_elements_text(coalesce(payload -> 'eligibleVoterIds', '[]'::jsonb))
    ) recipients
    where recipient is not null
  );
$$;

create or replace function public.can_read_vardag_record(target_household uuid, record_owner uuid, payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and public.is_household_member(target_household)
    and (
      record_owner = auth.uid()
      or (
        coalesce(payload ->> 'scope', 'family') = 'family'
        and (
          cardinality(public.vardag_record_recipients(payload)) = 0
          or auth.uid()::text = any(public.vardag_record_recipients(payload))
        )
      )
    );
$$;

drop policy if exists "profiles readable by signed in users" on public.profiles;
drop policy if exists "family profiles readable" on public.profiles;
create policy "family profiles readable" on public.profiles
  for select to authenticated using (
    id = auth.uid() or exists (
      select 1
      from public.household_members mine
      join public.household_members theirs on theirs.household_id = mine.household_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

drop policy if exists "members can read records" on public.vardag_records;
drop policy if exists "members can insert records" on public.vardag_records;
drop policy if exists "members can update records" on public.vardag_records;
drop policy if exists "members can delete records" on public.vardag_records;

create policy "allowed users can read records" on public.vardag_records
  for select to authenticated using (public.can_read_vardag_record(household_id, owner_id, payload));

create policy "members can insert owned records" on public.vardag_records
  for insert to authenticated with check (
    public.is_household_member(household_id)
    and owner_id = auth.uid()
  );

create policy "owners or whole family can update records" on public.vardag_records
  for update to authenticated using (
    public.is_household_member(household_id)
    and (
      owner_id = auth.uid()
      or (
        coalesce(payload ->> 'scope', 'family') = 'family'
        and cardinality(public.vardag_record_recipients(payload)) = 0
      )
    )
  ) with check (
    public.is_household_member(household_id)
    and (
      owner_id = auth.uid()
      or (
        coalesce(payload ->> 'scope', 'family') = 'family'
        and cardinality(public.vardag_record_recipients(payload)) = 0
      )
    )
  );

create policy "owners or whole family can delete records" on public.vardag_records
  for delete to authenticated using (
    public.is_household_member(household_id)
    and (
      owner_id = auth.uid()
      or (
        coalesce(payload ->> 'scope', 'family') = 'family'
        and cardinality(public.vardag_record_recipients(payload)) = 0
      )
    )
  );

create or replace function public.prevent_vardag_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id then raise exception 'Record owner cannot be changed'; end if;
  return new;
end;
$$;

drop trigger if exists keep_vardag_record_owner on public.vardag_records;
create trigger keep_vardag_record_owner before update on public.vardag_records
for each row execute function public.prevent_vardag_owner_change();

create or replace function public.add_food_vote_option(p_decision_id text, p_title text, p_suggested_by text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  updated_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'Title required'; end if;

  update public.vardag_records vr
  set payload = jsonb_set(
      vr.payload,
      '{options}',
      coalesce(vr.payload -> 'options', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', 'option-' || replace(gen_random_uuid()::text, '-', ''),
        'title', trim(p_title),
        'voterIds', '[]'::jsonb,
        'suggestedBy', p_suggested_by
      )),
      true
    ),
    updated_at = now()
  where vr.entity_type = 'food_decisions'
    and vr.record_id = p_decision_id
    and public.is_household_member(vr.household_id)
    and (
      vr.owner_id = auth.uid()
      or cardinality(public.vardag_record_recipients(vr.payload)) = 0
      or auth.uid()::text = any(public.vardag_record_recipients(vr.payload))
    )
  returning vr.payload into updated_payload;

  if updated_payload is null then raise exception 'Food vote not found or not allowed'; end if;
  return updated_payload;
end;
$$;

create or replace function public.vote_food_option(p_decision_id text, p_option_id text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  voter_id text := auth.uid()::text;
  updated_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  update public.vardag_records as vr
  set payload = jsonb_set(vr.payload, '{options}', (
      select coalesce(jsonb_agg(
        case when option_row ->> 'id' = p_option_id then
          jsonb_set(option_row, '{voterIds}', (
            select coalesce(jsonb_agg(to_jsonb(vote_id)), '[]'::jsonb)
            from (
              select distinct existing_vote as vote_id
              from jsonb_array_elements_text(coalesce(option_row -> 'voterIds', '[]'::jsonb)) votes(existing_vote)
              where existing_vote <> voter_id
              union all select voter_id
            ) selected_votes
          ))
        else
          jsonb_set(option_row, '{voterIds}', (
            select coalesce(jsonb_agg(to_jsonb(existing_vote)), '[]'::jsonb)
            from jsonb_array_elements_text(coalesce(option_row -> 'voterIds', '[]'::jsonb)) votes(existing_vote)
            where existing_vote <> voter_id
          ))
        end
      ), '[]'::jsonb)
      from jsonb_array_elements(coalesce(vr.payload -> 'options', '[]'::jsonb)) option_row
    ), true),
    updated_at = now()
  where vr.entity_type = 'food_decisions'
    and vr.record_id = p_decision_id
    and public.is_household_member(vr.household_id)
    and (
      vr.owner_id = auth.uid()
      or cardinality(public.vardag_record_recipients(vr.payload)) = 0
      or auth.uid()::text = any(public.vardag_record_recipients(vr.payload))
    )
  returning vr.payload into updated_payload;

  if updated_payload is null then raise exception 'Food vote not found or not allowed'; end if;
  return updated_payload;
end;
$$;

create or replace function public.decide_food_poll(p_decision_id text, p_option_id text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  selected_title text;
  updated_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select option_row ->> 'title' into selected_title
  from public.vardag_records vr,
       jsonb_array_elements(coalesce(vr.payload -> 'options', '[]'::jsonb)) option_row
  where vr.entity_type = 'food_decisions'
    and vr.record_id = p_decision_id
    and vr.owner_id = auth.uid()
    and option_row ->> 'id' = p_option_id;

  if selected_title is null then raise exception 'Option not found or only the owner may decide'; end if;

  update public.vardag_records vr
  set payload = jsonb_set(jsonb_set(vr.payload, '{status}', '"decided"'::jsonb, true), '{decidedMeal}', to_jsonb(selected_title), true),
      updated_at = now()
  where vr.entity_type = 'food_decisions' and vr.record_id = p_decision_id and vr.owner_id = auth.uid()
  returning vr.payload into updated_payload;

  return updated_payload;
end;
$$;

create or replace function public.set_record_completion(
  p_entity_type text,
  p_record_id text,
  p_completed boolean
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  updated_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_entity_type not in ('tasks', 'shopping_items', 'events') then raise exception 'Unsupported record type'; end if;

  update public.vardag_records vr
  set payload = case p_entity_type
      when 'tasks' then jsonb_set(vr.payload, '{status}', to_jsonb(case when p_completed then 'done' else 'todo' end::text), true)
      when 'shopping_items' then jsonb_set(vr.payload, '{isBought}', to_jsonb(p_completed), true)
      when 'events' then jsonb_set(vr.payload, '{isCompleted}', to_jsonb(p_completed), true)
    end,
    updated_at = now()
  where vr.entity_type = p_entity_type
    and vr.record_id = p_record_id
    and public.can_read_vardag_record(vr.household_id, vr.owner_id, vr.payload)
  returning vr.payload into updated_payload;

  if updated_payload is null then raise exception 'Record not found or not allowed'; end if;
  return updated_payload;
end;
$$;

grant execute on function public.vardag_record_recipients(jsonb) to authenticated;
grant execute on function public.can_read_vardag_record(uuid, uuid, jsonb) to authenticated;
grant execute on function public.add_food_vote_option(text, text, text) to authenticated;
grant execute on function public.vote_food_option(text, text) to authenticated;
grant execute on function public.decide_food_poll(text, text) to authenticated;
grant execute on function public.set_record_completion(text, text, boolean) to authenticated;
