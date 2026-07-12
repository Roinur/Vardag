import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });

try {
  const { translate } = await server.ssrLoadModule('/src/app/I18nContext.tsx');
  assert.equal(translate('sv', 'Today'), 'Idag');
  assert.equal(translate('sv', 'Completed Tasks'), 'Slutförda uppgifter');
  assert.equal(translate('sv', 'Household'), 'Hushåll');
  assert.equal(translate('sv', '{count} more items', { count: 3 }), '3 varor till');
  assert.equal(translate('en', 'Household'), 'Household');

  const navLabels = ['Today', 'Tasks', 'Events', 'Shopping', 'Food'].map((key) => translate('sv', key));
  assert.ok(navLabels.every((label) => label.length <= 10), `Swedish nav label too long: ${navLabels.join(', ')}`);

  const sourceFiles = [];
  const visit = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (/\.(?:ts|tsx|css)$/.test(entry.name)) sourceFiles.push(fullPath);
    }
  };
  await visit(path.resolve('src'));
  const source = (await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(source, /Ã|Â|â€/u, 'Broken UTF-8 text found in source');

  console.log('Languages: Swedish/English labels and UTF-8 checks passed');
} finally {
  await server.close();
}
