import { db } from './db';

export const clearAllData = async (): Promise<void> => {
  await db.transaction('rw', [db.entries, db.tasks, db.events, db.shoppingItems, db.foodLogs, db.foodDecisions, db.syncQueue], async () => {
    await Promise.all([
      db.entries.clear(),
      db.tasks.clear(),
      db.events.clear(),
      db.shoppingItems.clear(),
      db.foodLogs.clear(),
      db.foodDecisions.clear(),
      db.syncQueue.clear()
    ]);
  });
};
