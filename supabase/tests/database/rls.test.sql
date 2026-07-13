begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipient@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.test', '', now(), now(), now());

insert into public.households (id, name, invite_code, created_by)
values ('10000000-0000-0000-0000-000000000001', 'Test family', 'TEST0001', '00000000-0000-0000-0000-000000000001');

insert into public.household_members (household_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'member');

insert into public.vardag_records (household_id, owner_id, entity_type, record_id, payload)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'tasks', 'personal', '{"id":"personal","scope":"personal","title":"Private","status":"todo"}'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'tasks', 'family', '{"id":"family","scope":"family","title":"Shared","status":"todo"}'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'tasks', 'targeted', '{"id":"targeted","scope":"family","title":"Assigned","status":"todo","assigneeIds":["00000000-0000-0000-0000-000000000002"]}'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'food_decisions', 'poll', '{"id":"poll","scope":"family","eligibleVoterIds":["00000000-0000-0000-0000-000000000002"],"options":[]}');

insert into public.push_subscriptions (user_id, household_id, endpoint, p256dh, auth)
values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'https://push.test/owner', 'owner-key', 'owner-auth'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'https://push.test/recipient', 'recipient-key', 'recipient-auth');

set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.vardag_records), 4::bigint, 'owner reads every owned record');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.vardag_records), 3::bigint, 'recipient reads family, targeted, and eligible poll records');
select is((select count(*) from public.vardag_records where record_id = 'personal'), 0::bigint, 'recipient cannot read owner personal record');
select is((select count(*) from public.push_subscriptions), 1::bigint, 'recipient reads only their own push subscription');
select is((select count(*) from public.profiles where id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003')), 3::bigint, 'recipient reads profiles in their family');
select is((select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000099'), 0::bigint, 'recipient cannot read outsider profile');
select results_eq(
  $$update public.vardag_records set payload = jsonb_set(payload, '{title}', '"Tampered"') where record_id = 'targeted' returning record_id$$,
  array[]::text[],
  'recipient cannot directly rewrite a targeted record'
);
select is((public.set_record_completion('tasks', 'targeted', true) ->> 'status'), 'done', 'recipient can complete their targeted task through the RPC');
select throws_ok(
  $$select public.apply_vardag_mutation('10000000-0000-0000-0000-000000000001', 'tasks', 'targeted', '00000000-0000-0000-0000-000000000001', '{"id":"targeted","title":"Tampered"}', now() + interval '1 second', false)$$,
  'Mutation not allowed',
  'recipient cannot use the generic sync RPC to rewrite a targeted record'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.vardag_records), 1::bigint, 'unassigned family member reads only whole-family records');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000099', true);
select is((select count(*) from public.vardag_records), 0::bigint, 'outsider reads no family records');
select is((select count(*) from public.push_subscriptions), 0::bigint, 'outsider reads no push subscriptions');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is((with deleted as materialized (
  select public.apply_vardag_mutation(
    '10000000-0000-0000-0000-000000000001', 'tasks', 'personal',
    '00000000-0000-0000-0000-000000000001', null, now() + interval '2 seconds', true
  ) as payload
) select count(*) from deleted where payload is not null), 1::bigint, 'owner can create a persistent tombstone');
select is((select count(*) from public.vardag_records where record_id = 'personal' and deleted_at is not null), 1::bigint, 'deleted record remains as a sync tombstone');
select is((with stale as materialized (
  select public.apply_vardag_mutation(
    '10000000-0000-0000-0000-000000000001', 'tasks', 'personal',
    '00000000-0000-0000-0000-000000000001', '{"id":"personal","scope":"personal","title":"Resurrected"}', now() - interval '1 day', false
  ) as payload
) select count(*) from stale cross join public.vardag_records where record_id = 'personal' and deleted_at is not null), 1::bigint, 'stale upsert cannot resurrect a tombstoned record');

set local role service_role;
select is((select count(*) from public.push_subscriptions), 2::bigint, 'service role can resolve every intended push recipient');

select * from finish();
rollback;
