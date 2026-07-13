import Dexie, { type Table } from 'dexie';
import type { CalendarEvent, Entry, FoodDecision, FoodLog, ShoppingItem, Task } from '../types/models';
import type { CloudEntityType } from './cloudSync';

export interface SyncMutation {
  id: string;
  entityType: CloudEntityType;
  recordId: string;
  operation: 'upsert' | 'delete' | 'completion' | 'vote' | 'add_vote_option' | 'decide_vote';
  payload?: Record<string, unknown>;
  ownerId?: string;
  clientUpdatedAt: string;
  householdId: string;
  userId: string;
  notifyAssignment?: boolean;
  completed?: boolean;
  optionId?: string;
  title?: string;
  suggestedBy?: string;
}

export class VardagDatabase extends Dexie {
  entries!: Table<Entry, string>;
  tasks!: Table<Task, string>;
  events!: Table<CalendarEvent, string>;
  shoppingItems!: Table<ShoppingItem, string>;
  foodLogs!: Table<FoodLog, string>;
  foodDecisions!: Table<FoodDecision, string>;
  syncQueue!: Table<SyncMutation, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      entries: 'id, createdAt, entryDate',
      tasks: 'id, dueDate, status, priority, createdAt',
      events: 'id, startDate, startTime, category, createdAt',
      shoppingItems: 'id, category, isBought, createdAt',
      foodLogs: 'id, eatenAt, mealType, createdAt'
    });
    this.version(2).stores({
      entries: 'id, createdAt, entryDate',
      tasks: 'id, dueDate, status, priority, createdAt',
      events: 'id, startDate, startTime, category, createdAt',
      shoppingItems: 'id, category, isBought, createdAt',
      foodLogs: 'id, eatenAt, mealType, createdAt',
      foodDecisions: 'id, mealDate, mealType, status, createdAt'
    });
    this.version(3).stores({
      entries: 'id, createdAt, entryDate, updatedAt',
      tasks: 'id, dueDate, status, priority, createdAt, updatedAt',
      events: 'id, startDate, startTime, category, createdAt, updatedAt',
      shoppingItems: 'id, category, isBought, createdAt, updatedAt',
      foodLogs: 'id, eatenAt, mealType, createdAt, updatedAt',
      foodDecisions: 'id, mealDate, mealType, status, createdAt, updatedAt',
      syncQueue: 'id, entityType, recordId, clientUpdatedAt'
    });
  }
}

const safeScope = (scope: string): string => scope.replace(/[^a-zA-Z0-9_-]/g, '_');
let activeScope = 'anonymous';
export let db = new VardagDatabase(`vardag_${activeScope}`);

export const switchDatabaseScope = async (scope: string): Promise<void> => {
  const nextScope = safeScope(scope || 'anonymous');
  if (nextScope === activeScope) return;
  db.close();
  activeScope = nextScope;
  db = new VardagDatabase(`vardag_${activeScope}`);
  await db.open();
};

export const currentDatabaseScope = (): string => activeScope;
