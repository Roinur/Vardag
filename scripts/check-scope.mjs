import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });

try {
  const { parseEntryText } = await server.ssrLoadModule('/src/lib/parser.ts');
  const { convertSuggestion } = await server.ssrLoadModule('/src/components/SuggestionCard.tsx');
  const { isRecordVisibleToUser } = await server.ssrLoadModule('/src/lib/recordVisibility.ts');

  const parsed = parseEntryText('Köp mjölk och boka tandläkaren imorgon');
  assert.ok(parsed.length > 1);
  assert.ok(parsed.every((item) => item.scope === 'personal'), 'Detected cards must default to personal');

  const familyTask = { ...parsed.find((item) => item.type === 'task'), scope: 'family' };
  const converted = convertSuggestion(familyTask, 'event');
  assert.equal(converted.scope, 'family', 'Changing card type must preserve scope');

  assert.equal(isRecordVisibleToUser({ scope: 'personal', ownerId: 'anna' }, 'anna'), true);
  assert.equal(isRecordVisibleToUser({ scope: 'personal', ownerId: 'anna' }, 'erik'), false);
  assert.equal(isRecordVisibleToUser({ scope: 'family', ownerId: 'anna' }, 'erik'), true);
  assert.equal(isRecordVisibleToUser({ scope: 'family', ownerId: 'anna', assigneeIds: ['erik'] }, 'erik'), true);
  assert.equal(isRecordVisibleToUser({ scope: 'family', ownerId: 'anna', assigneeIds: ['erik'] }, 'anna'), true);
  assert.equal(isRecordVisibleToUser({ scope: 'family', ownerId: 'anna', assigneeIds: ['erik'] }, 'lisa'), false);
  assert.equal(isRecordVisibleToUser({ scope: 'family', ownerId: 'anna', eligibleVoterIds: ['lisa'] }, 'lisa'), true);
  assert.equal(isRecordVisibleToUser({ scope: 'family', ownerId: 'anna', eligibleVoterIds: ['lisa'] }, 'erik'), false);

  const sql = await readFile('supabase/migrations/202607110001_record_scopes.sql', 'utf8');
  assert.match(sql, /payload ->> 'scope'/u);
  assert.match(sql, /owner_id = \(select auth\.uid\(\)\)/u);

  const secureSql = await readFile('supabase/migrations/202607130001_secure_family_records.sql', 'utf8');
  assert.match(secureSql, /can_read_vardag_record/u);
  assert.match(secureSql, /eligibleVoterIds/u);
  assert.match(secureSql, /prevent_vardag_owner_change/u);

  console.log('Sharing scopes: parser defaults, recipient visibility and RLS migrations passed');
} finally {
  await server.close();
}
