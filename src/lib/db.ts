import Dexie, { type Table } from 'dexie';
import type { CalendarEvent, Entry, FoodDecision, FoodLog, ShoppingItem, Task } from '../types/models';

export class VardagDatabase extends Dexie {
  entries!: Table<Entry, string>;
  tasks!: Table<Task, string>;
  events!: Table<CalendarEvent, string>;
  shoppingItems!: Table<ShoppingItem, string>;
  foodLogs!: Table<FoodLog, string>;
  foodDecisions!: Table<FoodDecision, string>;

  constructor() {
    super('vardag');
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
  }
}

export const db = new VardagDatabase();
