export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'done';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type SharingScope = 'personal' | 'family';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface ScopedRecord {
  scope?: SharingScope;
  ownerId?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeIds?: string[];
  assigneeNames?: string[];
  updatedAt?: string;
}

export interface Entry extends ScopedRecord {
  id: string;
  rawText: string;
  createdAt: string;
  entryDate: string;
}

export interface Task extends ScopedRecord {
  id: string;
  sourceEntryId?: string;
  title: string;
  dueDate?: string;
  category?: string;
  priority: Priority;
  status: TaskStatus;
  repeat?: RepeatRule;
  createdAt: string;
}

export interface CalendarEvent extends ScopedRecord {
  id: string;
  sourceEntryId?: string;
  title: string;
  startDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category?: string;
  repeat?: RepeatRule;
  isCompleted?: boolean;
  createdAt: string;
}

export interface ShoppingItem extends ScopedRecord {
  id: string;
  sourceEntryId?: string;
  name: string;
  quantity?: string;
  category?: string;
  barcode?: string;
  brand?: string;
  imageUrl?: string;
  isBought: boolean;
  createdAt: string;
}

export interface FoodLog extends ScopedRecord {
  id: string;
  sourceEntryId?: string;
  sourceDecisionId?: string;
  title: string;
  mealType?: MealType;
  eatenAt: string;
  notes?: string;
  portionsLeft?: number;
  hiddenFromToday?: boolean;
  createdAt: string;
}

export type FoodDecisionMode = 'fixed' | 'poll';
export type FoodDecisionStatus = 'open' | 'decided';

export interface FoodVoteOption {
  id: string;
  title: string;
  voterIds: string[];
  suggestedBy?: string;
}

export interface FoodDecision extends ScopedRecord {
  id: string;
  title: string;
  mealDate: string;
  mealType: MealType;
  mode: FoodDecisionMode;
  status: FoodDecisionStatus;
  decidedMeal?: string;
  eligibleVoterIds?: string[];
  eligibleVoterNames?: string[];
  options: FoodVoteOption[];
  createdAt: string;
}

export type SuggestionType = 'task' | 'event' | 'shopping' | 'food';

export interface TaskSuggestion {
  id: string;
  type: 'task';
  title: string;
  dueDate?: string;
  category?: string;
  priority: Priority;
  scope?: SharingScope;
  assigneeId?: string;
  assigneeName?: string;
  assigneeIds?: string[];
  assigneeNames?: string[];
}

export interface EventSuggestion {
  id: string;
  type: 'event';
  title: string;
  startDate: string;
  startTime?: string;
  location?: string;
  category?: string;
  scope?: SharingScope;
  assigneeId?: string;
  assigneeName?: string;
  assigneeIds?: string[];
  assigneeNames?: string[];
}

export interface ShoppingSuggestion {
  id: string;
  type: 'shopping';
  name: string;
  quantity?: string;
  category?: string;
  barcode?: string;
  brand?: string;
  imageUrl?: string;
  scope?: SharingScope;
  assigneeId?: string;
  assigneeName?: string;
  assigneeIds?: string[];
  assigneeNames?: string[];
}

export interface FoodSuggestion {
  id: string;
  type: 'food';
  title: string;
  mealType?: MealType;
  eatenAt: string;
  portionsLeft?: number;
  scope?: SharingScope;
  assigneeId?: string;
  assigneeName?: string;
  assigneeIds?: string[];
  assigneeNames?: string[];
}

export type Suggestion =
  | TaskSuggestion
  | EventSuggestion
  | ShoppingSuggestion
  | FoodSuggestion;

export interface AppStateSnapshot {
  entries: Entry[];
  tasks: Task[];
  events: CalendarEvent[];
  shoppingItems: ShoppingItem[];
  foodLogs: FoodLog[];
  foodDecisions: FoodDecision[];
}
