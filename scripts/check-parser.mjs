import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent'
});

try {
  const { parseEntryText } = await server.ssrLoadModule('/src/lib/parser.ts');
  const { detectIntentHint } = await server.ssrLoadModule('/src/lib/intentDetection.ts');

  const shopping = parseEntryText('Köp 2 kg ris och mjölk');
  assert.deepEqual(shopping.map((item) => item.type), ['shopping', 'shopping']);
  assert.equal(shopping[0].quantity, '2 kg');
  assert.equal(shopping[0].name, 'Ris');
  assert.equal(shopping[1].name, 'Mjölk');

  const mixed = parseEntryText('Köp mjölk och boka tandläkaren imorgon');
  assert.deepEqual(mixed.map((item) => item.type), ['shopping', 'task']);
  assert.equal(mixed[0].name, 'Mjölk');
  assert.match(mixed[1].title, /tandläkaren/i);
  assert.ok(mixed[1].dueDate);

  const planned = parseEntryText('Imorgon ska jag träna kl 18 och köpa mjölk');
  assert.deepEqual(planned.map((item) => item.type), ['task', 'shopping']);

  const dinner = parseEntryText('Middag hos mamma imorgon kl 18');
  assert.equal(dinner.length, 1);
  assert.equal(dinner[0].type, 'event');
  assert.equal(dinner[0].startTime, '18:00');
  assert.equal(dinner[0].location, 'Mamma');

  const lunch = parseEntryText('Lunch med Anna på fredag kl 12');
  assert.equal(lunch[0].type, 'event');
  assert.equal(lunch[0].startTime, '12:00');

  const food = parseEntryText('Åt pasta till lunch, 2 portioner kvar');
  assert.equal(food[0].type, 'food');
  assert.equal(food[0].title, 'Pasta');
  assert.equal(food[0].mealType, 'lunch');
  assert.equal(food[0].portionsLeft, 2);

  const explicit = parseEntryText('event: Projektmöte 15/8 kl 14:30 på kontoret');
  assert.equal(explicit[0].type, 'event');
  assert.equal(explicit[0].startTime, '14:30');
  assert.equal(explicit[0].location, 'Kontoret');

  const deduplicated = parseEntryText('Köp mjölk; köp mjölk');
  assert.equal(deduplicated.length, 1);

  const naturalTask = parseEntryText('Jag måste lämna in matteuppgiften på fredag');
  assert.equal(naturalTask[0].type, 'task');
  assert.equal(naturalTask[0].title, 'Matteuppgiften');
  assert.equal(naturalTask[0].category, 'School');

  const naturalShopping = parseEntryText('Vi behöver köpa kaffe och 2 liter mjölk');
  assert.deepEqual(naturalShopping.map((item) => item.name), ['Kaffe', 'Mjölk']);
  assert.equal(naturalShopping[1].quantity, '2 liter');

  const shoppingList = parseEntryText('Lägg till diskmedel på inköpslistan');
  assert.equal(shoppingList[0].type, 'shopping');
  assert.equal(shoppingList[0].name, 'Diskmedel');
  assert.equal(shoppingList[0].category, 'Household');

  const reminder = parseEntryText('Påminn mig att ringa pappa imorgon');
  assert.equal(reminder[0].type, 'task');
  assert.equal(reminder[0].title, 'Ringa pappa');

  const wordQuantity = parseEntryText('Köp fem ägg');
  assert.equal(wordQuantity[0].name, 'Ägg');
  assert.equal(wordQuantity[0].quantity, '5 st');

  const naturalDate = parseEntryText('event: Åka till tandläkaren kl 15 den 17e juli');
  assert.equal(naturalDate[0].type, 'event');
  assert.equal(naturalDate[0].startTime, '15:00');
  assert.match(naturalDate[0].startDate, /-07-17$/u);

  const multiSentence = 'Köp fem ägg. Åka till tandläkaren kl 15 den 17e juli. Städa rummet idag.';
  const firstHint = detectIntentHint(multiSentence);
  assert.equal(firstHint.trigger.toLocaleLowerCase('sv'), 'köp');
  const secondHint = detectIntentHint(multiSentence, new Set([0]));
  assert.equal(secondHint.trigger.toLocaleLowerCase('sv'), 'åka');
  assert.deepEqual(secondHint.candidates, ['event', 'task']);
  const thirdHint = detectIntentHint(multiSentence, new Set([0, 1]));
  assert.equal(thirdHint.trigger.toLocaleLowerCase('sv'), 'städa');

  const assigned = parseEntryText('Köp fem liter mjölk till Alex imorgon', [{ id: 'member-alex', name: 'Alex' }]);
  assert.equal(assigned[0].name, 'Mjölk');
  assert.equal(assigned[0].quantity, '5 liter');
  assert.deepEqual(assigned[0].assigneeIds, ['member-alex']);
  assert.deepEqual(assigned[0].assigneeNames, ['Alex']);

  console.log('Detect Cards parser and live intents: 16 scenarios passed');
} finally {
  await server.close();
}
