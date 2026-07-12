drop policy if exists "members can read records" on public.vardag_records;
drop policy if exists "members can insert records" on public.vardag_records;
drop policy if exists "members can update records" on public.vardag_records;
drop policy if exists "members can delete records" on public.vardag_records;

create policy "members can read visible records" on public.vardag_records
  for select to authenticated
  using (
    (select public.is_household_member(household_id))
    and (
      coalesce(payload ->> 'scope', 'family') = 'family'
      or owner_id = (select auth.uid())
    )
  );

create policy "members can insert visible records" on public.vardag_records
  for insert to authenticated
  with check (
    (select public.is_household_member(household_id))
    and owner_id = (select auth.uid())
  );

create policy "members can update visible records" on public.vardag_records
  for update to authenticated
  using (
    (select public.is_household_member(household_id))
    and (
      coalesce(payload ->> 'scope', 'family') = 'family'
      or owner_id = (select auth.uid())
    )
  )
  with check (
    (select public.is_household_member(household_id))
    and (
      coalesce(payload ->> 'scope', 'family') = 'family'
      or owner_id = (select auth.uid())
    )
  );

create policy "members can delete visible records" on public.vardag_records
  for delete to authenticated
  using (
    (select public.is_household_member(household_id))
    and (
      coalesce(payload ->> 'scope', 'family') = 'family'
      or owner_id = (select auth.uid())
    )
  );
