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

  update public.vardag_records as vr
  set payload = case p_entity_type
      when 'tasks' then jsonb_set(vr.payload, '{status}', to_jsonb(case when p_completed then 'done' else 'todo' end::text), true)
      when 'shopping_items' then jsonb_set(vr.payload, '{isBought}', to_jsonb(p_completed), true)
      when 'events' then jsonb_set(vr.payload, '{isCompleted}', to_jsonb(p_completed), true)
    end,
    updated_at = now()
  where vr.entity_type = p_entity_type
    and vr.record_id = p_record_id
    and public.is_household_member(vr.household_id)
  returning vr.payload into updated_payload;

  if updated_payload is null then raise exception 'Record not found'; end if;
  return updated_payload;
end;
$$;

grant execute on function public.set_record_completion(text, text, boolean) to authenticated;
