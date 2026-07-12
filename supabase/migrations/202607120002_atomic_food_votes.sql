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
  set payload = jsonb_set(
    vr.payload,
    '{options}',
    (
      select coalesce(jsonb_agg(
        case
          when option_row ->> 'id' = p_option_id then
            jsonb_set(option_row, '{voterIds}', (
              select coalesce(jsonb_agg(to_jsonb(vote_id)), '[]'::jsonb)
              from (
                select distinct existing_vote as vote_id
                from jsonb_array_elements_text(coalesce(option_row -> 'voterIds', '[]'::jsonb)) as votes(existing_vote)
                where existing_vote <> voter_id
                union all select voter_id
              ) as selected_votes
            ))
          else
            jsonb_set(option_row, '{voterIds}', (
              select coalesce(jsonb_agg(to_jsonb(existing_vote)), '[]'::jsonb)
              from jsonb_array_elements_text(coalesce(option_row -> 'voterIds', '[]'::jsonb)) as votes(existing_vote)
              where existing_vote <> voter_id
            ))
        end
      ), '[]'::jsonb)
      from jsonb_array_elements(coalesce(vr.payload -> 'options', '[]'::jsonb)) as option_row
    ),
    true
  ),
  updated_at = now()
  where vr.entity_type = 'food_decisions'
    and vr.record_id = p_decision_id
    and public.is_household_member(vr.household_id)
  returning vr.payload into updated_payload;

  if updated_payload is null then raise exception 'Food vote not found'; end if;
  return updated_payload;
end;
$$;

grant execute on function public.vote_food_option(text, text) to authenticated;
