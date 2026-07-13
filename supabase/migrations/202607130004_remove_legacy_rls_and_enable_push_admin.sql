drop policy if exists "members can read visible records" on public.vardag_records;
drop policy if exists "members can insert visible records" on public.vardag_records;
drop policy if exists "members can update visible records" on public.vardag_records;
drop policy if exists "members can delete visible records" on public.vardag_records;

grant select on public.vardag_records to service_role;
grant select on public.household_members to service_role;
grant select on public.profiles to service_role;
grant select, delete on public.push_subscriptions to service_role;
