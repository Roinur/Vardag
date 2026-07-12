import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type {
  AppStateSnapshot,
  CalendarEvent,
  Entry,
  FoodDecision,
  FoodLog,
  ShoppingItem,
  SharingScope,
  Suggestion,
  Task
} from '../types/models';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';
import {
  clearCloudSnapshot,
  deleteCloudRecord,
  pullCloudSnapshot,
  pushCloudRecord,
  pushCloudSnapshot,
  type CloudEntityType
} from '../lib/cloudSync';
import { db } from '../lib/db';
import { clearAllData } from '../lib/exportImport';
import { appendFoodOption, applyFoodVote, decideFoodWinner } from '../lib/foodDecisions';
import { parseEntryText } from '../lib/parser';
import { supabase } from '../lib/supabase';
import { byCreatedDesc, dateTimeISO, todayISO, uid } from '../lib/utils';
import { nextRecurringDate } from '../lib/recurrence';
import { showNewTaskNotification, updateTodayNotification } from '../lib/notifications';
import { registerPushSubscription, sendTaskAssignmentPush } from '../lib/pushSubscriptions';

type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'status'> & Partial<Pick<Task, 'status'>>;
type CreateEventInput = Omit<CalendarEvent, 'id' | 'createdAt'>;
type CreateShoppingInput = Omit<ShoppingItem, 'id' | 'createdAt' | 'isBought'> & Partial<Pick<ShoppingItem, 'isBought'>>;
type CreateFoodInput = Omit<FoodLog, 'id' | 'createdAt'>;
type CreateFoodDecisionInput = Omit<FoodDecision, 'id' | 'createdAt'>;
export type CloudStatus = 'local' | 'syncing' | 'synced' | 'error';
export type NotificationFrequency = 'off' | 'once' | 'hourly' | 'threeHours' | 'sixHours';

interface ParsedEntry {
  entryId: string;
  suggestions: Suggestion[];
}

interface VardagDataContextValue extends AppStateSnapshot {
  isLoading: boolean;
  cloudStatus: CloudStatus;
  cloudError: string;
  currentVoterId: string;
  currentVoterName: string;
  notificationFrequency: NotificationFrequency;
  setNotificationFrequency: (frequency: NotificationFrequency) => void;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  submitEntry: (rawText: string, scope?: SharingScope) => Promise<ParsedEntry>;
  acceptSuggestion: (suggestion: Suggestion, sourceEntryId?: string) => Promise<void>;
  addTask: (task: CreateTaskInput) => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addEvent: (event: CreateEventInput) => Promise<void>;
  toggleEvent: (event: CalendarEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addShoppingItem: (item: CreateShoppingInput) => Promise<void>;
  toggleShoppingItem: (item: ShoppingItem) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  clearBoughtShoppingItems: (scope?: 'personal' | 'family') => Promise<void>;
  addFoodLog: (food: CreateFoodInput) => Promise<FoodLog>;
  adjustFoodPortions: (id: string, delta: number) => Promise<void>;
  removeFoodFromToday: (id: string) => Promise<void>;
  deleteFoodLog: (id: string) => Promise<void>;
  addFoodDecision: (decision: CreateFoodDecisionInput) => Promise<FoodDecision>;
  voteFoodOption: (decisionId: string, optionId: string) => Promise<void>;
  addFoodVoteOption: (decisionId: string, title: string) => Promise<void>;
  decideFoodPoll: (decisionId: string, optionId?: string) => Promise<void>;
  deleteFoodDecision: (id: string) => Promise<void>;
  clearData: () => Promise<void>;
}

const emptySnapshot: AppStateSnapshot = {
  entries: [],
  tasks: [],
  events: [],
  shoppingItems: [],
  foodLogs: [],
  foodDecisions: []
};

const VardagDataContext = createContext<VardagDataContextValue | undefined>(undefined);

const getDeviceVoterId = (): string => {
  const key = 'vardag-device-voter';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = uid('voter');
  localStorage.setItem(key, id);
  return id;
};

const loadSnapshot = async (): Promise<AppStateSnapshot> => ({
  entries: (await db.entries.toArray()).sort(byCreatedDesc),
  tasks: (await db.tasks.toArray()).sort(byCreatedDesc),
  events: (await db.events.toArray()).sort((a, b) => `${a.startDate}${a.startTime ?? ''}`.localeCompare(`${b.startDate}${b.startTime ?? ''}`)),
  shoppingItems: (await db.shoppingItems.toArray()).sort(byCreatedDesc),
  foodLogs: (await db.foodLogs.toArray()).sort(byCreatedDesc),
  foodDecisions: (await db.foodDecisions.toArray()).sort((a, b) => `${a.mealDate}${a.createdAt}`.localeCompare(`${b.mealDate}${b.createdAt}`))
});

const replaceLocalSnapshot = async (snapshot: AppStateSnapshot): Promise<void> => {
  await db.transaction('rw', [db.entries, db.tasks, db.events, db.shoppingItems, db.foodLogs, db.foodDecisions], async () => {
    await Promise.all([
      db.entries.clear(), db.tasks.clear(), db.events.clear(), db.shoppingItems.clear(), db.foodLogs.clear(), db.foodDecisions.clear()
    ]);
    await Promise.all([
      db.entries.bulkPut(snapshot.entries),
      db.tasks.bulkPut(snapshot.tasks),
      db.events.bulkPut(snapshot.events),
      db.shoppingItems.bulkPut(snapshot.shoppingItems),
      db.foodLogs.bulkPut(snapshot.foodLogs),
      db.foodDecisions.bulkPut(snapshot.foodDecisions)
    ]);
  });
};

export function VardagDataProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user, household, householdMembers } = useAuth();
  const [snapshot, setSnapshot] = useState<AppStateSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('local');
  const [cloudError, setCloudError] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => 'Notification' in window ? Notification.permission : 'denied');
  const [notificationFrequency, setNotificationFrequencyState] = useState<NotificationFrequency>(() => {
    const saved = localStorage.getItem('vardag-notification-frequency');
    return saved === 'off' || saved === 'once' || saved === 'hourly' || saved === 'threeHours' || saved === 'sixHours' ? saved : 'threeHours';
  });
  const knownTaskIds = useRef<Set<string>>();
  const deviceVoterId = useMemo(getDeviceVoterId, []);
  const currentVoterId = user?.id ?? deviceVoterId;
  const currentVoterName = String(user?.user_metadata?.full_name ?? user?.email ?? t('This device'));
  const isRecordForCurrentUser = useCallback((record: { scope?: SharingScope; ownerId?: string; assigneeId?: string; assigneeIds?: string[] }) => {
    if (!user?.id) return false;
    const recipientIds = record.assigneeIds?.length ? record.assigneeIds : record.assigneeId ? [record.assigneeId] : [];
    if (recipientIds.length) return recipientIds.includes(user.id);
    return record.scope === 'family' || record.ownerId === user.id;
  }, [user?.id]);
  const setNotificationFrequency = useCallback((frequency: NotificationFrequency) => {
    localStorage.setItem('vardag-notification-frequency', frequency);
    setNotificationFrequencyState(frequency);
  }, []);

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return undefined;
    const request = () => void Notification.requestPermission().then(setNotificationPermission);
    window.addEventListener('pointerdown', request, { once: true });
    return () => window.removeEventListener('pointerdown', request);
  }, []);

  useEffect(() => {
    const ids = new Set(snapshot.tasks.map((task) => task.id));
    if (!knownTaskIds.current) {
      knownTaskIds.current = ids;
    } else if (notificationPermission === 'granted') {
      snapshot.tasks.filter((task) => !knownTaskIds.current?.has(task.id) && task.ownerId !== user?.id && isRecordForCurrentUser(task)).forEach((task) => {
        const sender = householdMembers.find((member) => member.id === task.ownerId)?.displayName ?? t('Family member');
        void showNewTaskNotification(task, sender, { title: t('New task'), from: t('From') });
      });
      knownTaskIds.current = ids;
    }
  }, [householdMembers, isRecordForCurrentUser, notificationPermission, snapshot.tasks, t, user?.id]);

  useEffect(() => {
    if (notificationPermission !== 'granted') return undefined;
    const todayTasks = () => snapshot.tasks.filter((task) => task.status === 'todo' && task.dueDate === todayISO() && isRecordForCurrentUser(task));
    const remind = () => {
      const tasks = todayTasks();
      void updateTodayNotification(tasks, { title: t(tasks.length === 1 ? 'One task today' : '{count} tasks today', { count: tasks.length }) });
    };
    if (notificationFrequency === 'off') {
      void updateTodayNotification([], { title: '' });
      return undefined;
    }
    remind();
    if (notificationFrequency === 'once') return undefined;
    const delays: Record<Exclude<NotificationFrequency, 'off' | 'once'>, number> = {
      hourly: 60 * 60 * 1000,
      threeHours: 3 * 60 * 60 * 1000,
      sixHours: 6 * 60 * 60 * 1000
    };
    const timer = window.setInterval(remind, delays[notificationFrequency]);
    return () => window.clearInterval(timer);
  }, [isRecordForCurrentUser, notificationFrequency, notificationPermission, snapshot.tasks, t]);

  useEffect(() => {
    if (notificationPermission !== 'granted' || !household?.id) return;
    void registerPushSubscription(household.id).catch(() => undefined);
  }, [household?.id, notificationPermission]);

  const refresh = useCallback(async () => setSnapshot(await loadSnapshot()), []);

  const markCloudError = useCallback((error: unknown) => {
    setCloudStatus('error');
    setCloudError(error instanceof Error ? error.message : 'Cloud sync failed. Local data is safe.');
  }, []);

  const syncRecord = useCallback(async (entityType: CloudEntityType, record: { id: string }) => {
    if (!household?.id || !user?.id) return;
    setCloudStatus('syncing');
    try {
      await pushCloudRecord(household.id, user.id, entityType, record);
      setCloudStatus('synced');
      setCloudError('');
    } catch (error) {
      markCloudError(error);
    }
  }, [household?.id, markCloudError, user?.id]);

  const syncDelete = useCallback(async (entityType: CloudEntityType, recordId: string) => {
    if (!household?.id) return;
    try {
      await deleteCloudRecord(household.id, entityType, recordId);
      setCloudStatus('synced');
    } catch (error) {
      markCloudError(error);
    }
  }, [household?.id, markCloudError]);

  const setRemoteCompletion = useCallback(async <T extends { id: string },>(entityType: 'tasks' | 'shopping_items' | 'events', recordId: string, completed: boolean): Promise<T | undefined> => {
    if (!supabase || !household?.id || !user?.id) return undefined;
    const { data, error } = await supabase.rpc('set_record_completion', {
      p_entity_type: entityType,
      p_record_id: recordId,
      p_completed: completed
    });
    if (error) {
      if (!error.message.includes('set_record_completion')) markCloudError(error);
      return undefined;
    }
    return data as T;
  }, [household?.id, markCloudError, user?.id]);

  const syncNow = useCallback(async () => {
    if (!household?.id || !user?.id) {
      setCloudStatus('local');
      return;
    }
    setCloudStatus('syncing');
    try {
      const remote = await pullCloudSnapshot(household.id);
      if (remote) {
        await replaceLocalSnapshot(remote);
      } else {
        await pushCloudSnapshot(household.id, user.id, await loadSnapshot());
      }
      await refresh();
      setCloudStatus('synced');
      setCloudError('');
    } catch (error) {
      markCloudError(error);
    }
  }, [household?.id, markCloudError, refresh, user?.id]);

  useEffect(() => {
    const initialize = async () => {
      await refresh();
      setIsLoading(false);
    };
    initialize().catch(() => setIsLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!isLoading && household?.id && user?.id) void syncNow();
  }, [household?.id, isLoading, syncNow, user?.id]);

  useEffect(() => {
    if (!supabase || !household?.id) return undefined;
    const client = supabase;
    const channel = client
      .channel(`vardag-${household.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vardag_records', filter: `household_id=eq.${household.id}`
      }, () => void pullCloudSnapshot(household.id).then(async (remote) => {
        if (!remote) return;
        await replaceLocalSnapshot(remote);
        await refresh();
      }).catch(markCloudError))
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [household?.id, markCloudError, refresh]);

  const submitEntry = useCallback(async (rawText: string, scope: SharingScope = 'personal'): Promise<ParsedEntry> => {
    const entry: Entry = { id: uid('entry'), rawText, createdAt: dateTimeISO(), entryDate: todayISO(), scope, ownerId: user?.id };
    await db.entries.add(entry);
    await syncRecord('entries', entry);
    await refresh();
    return { entryId: entry.id, suggestions: parseEntryText(rawText).map((suggestion) => ({ ...suggestion, scope })) };
  }, [refresh, syncRecord, user?.id]);

  const addTask = useCallback(async (task: CreateTaskInput) => {
    const record: Task = { ...task, ownerId: task.ownerId ?? user?.id, scope: task.scope ?? 'family', id: uid('task'), status: task.status ?? 'todo', createdAt: dateTimeISO() };
    await db.tasks.add(record); await syncRecord('tasks', record); await refresh();
    void sendTaskAssignmentPush(record).catch(() => undefined);
  }, [refresh, syncRecord, user?.id]);

  const toggleTask = useCallback(async (task: Task) => {
    const completed = task.status !== 'done';
    const remote = await setRemoteCompletion<Task>('tasks', task.id, completed);
    const record = remote ?? { ...task, status: completed ? 'done' : 'todo' } as Task;
    await db.tasks.put(record);
    if (!remote) await syncRecord('tasks', record);
    await refresh();
    if (record.status === 'done' && task.repeat && task.repeat !== 'none' && task.dueDate) {
      const nextDate = nextRecurringDate(task.dueDate, task.repeat);
      const exists = await db.tasks.filter((candidate) => candidate.status === 'todo' && candidate.title === task.title && candidate.dueDate === nextDate && candidate.repeat === task.repeat).first();
      if (exists) return;
      const next: Task = { ...task, id: uid('task'), dueDate: nextDate, status: 'todo', createdAt: dateTimeISO() };
      await db.tasks.add(next); await syncRecord('tasks', next); await refresh();
    }
  }, [refresh, setRemoteCompletion, syncRecord]);

  const deleteTask = useCallback(async (id: string) => {
    await db.tasks.delete(id); await syncDelete('tasks', id); await refresh();
  }, [refresh, syncDelete]);

  const addEvent = useCallback(async (event: CreateEventInput) => {
    const record: CalendarEvent = { ...event, ownerId: event.ownerId ?? user?.id, scope: event.scope ?? 'family', id: uid('event'), createdAt: dateTimeISO() };
    await db.events.add(record); await syncRecord('events', record); await refresh();
  }, [refresh, syncRecord, user?.id]);

  const toggleEvent = useCallback(async (event: CalendarEvent) => {
    const completed = !event.isCompleted;
    const remote = await setRemoteCompletion<CalendarEvent>('events', event.id, completed);
    const record: CalendarEvent = remote ?? { ...event, isCompleted: completed };
    await db.events.put(record);
    if (!remote) await syncRecord('events', record);
    await refresh();
  }, [refresh, setRemoteCompletion, syncRecord]);

  const deleteEvent = useCallback(async (id: string) => {
    await db.events.delete(id); await syncDelete('events', id); await refresh();
  }, [refresh, syncDelete]);

  const addShoppingItem = useCallback(async (item: CreateShoppingInput) => {
    const record: ShoppingItem = { ...item, ownerId: item.ownerId ?? user?.id, scope: item.scope ?? 'family', id: uid('shop'), isBought: item.isBought ?? false, createdAt: dateTimeISO() };
    await db.shoppingItems.add(record); await syncRecord('shopping_items', record); await refresh();
  }, [refresh, syncRecord, user?.id]);

  const toggleShoppingItem = useCallback(async (item: ShoppingItem) => {
    const completed = !item.isBought;
    const remote = await setRemoteCompletion<ShoppingItem>('shopping_items', item.id, completed);
    const record = remote ?? { ...item, isBought: completed };
    await db.shoppingItems.put(record);
    if (!remote) await syncRecord('shopping_items', record);
    await refresh();
  }, [refresh, setRemoteCompletion, syncRecord]);

  const deleteShoppingItem = useCallback(async (id: string) => {
    await db.shoppingItems.delete(id); await syncDelete('shopping_items', id); await refresh();
  }, [refresh, syncDelete]);

  const clearBoughtShoppingItems = useCallback(async (scope?: 'personal' | 'family') => {
    const boughtIds = (await db.shoppingItems
      .filter((item) => item.isBought && (!scope || (item.scope ?? 'family') === scope))
      .toArray()).map((item) => item.id);
    if (boughtIds.length === 0) return;
    await db.shoppingItems.bulkDelete(boughtIds);
    await Promise.all(boughtIds.map((id) => syncDelete('shopping_items', id)));
    await refresh();
  }, [refresh, syncDelete]);

  const addFoodLog = useCallback(async (food: CreateFoodInput) => {
    const record: FoodLog = { ...food, ownerId: food.ownerId ?? user?.id, scope: food.scope ?? 'family', id: uid('food'), createdAt: dateTimeISO() };
    await db.foodLogs.add(record); await syncRecord('food_logs', record); await refresh();
    return record;
  }, [refresh, syncRecord, user?.id]);

  const adjustFoodPortions = useCallback(async (id: string, delta: number) => {
    const current = await db.foodLogs.get(id);
    if (!current) return;
    const nextPortions = Math.max(0, (current.portionsLeft ?? 0) + delta);
    if (nextPortions === 0 && current.hiddenFromToday) {
      await db.foodLogs.delete(id); await syncDelete('food_logs', id); await refresh();
      return;
    }
    const record: FoodLog = { ...current, portionsLeft: nextPortions };
    await db.foodLogs.put(record); await syncRecord('food_logs', record); await refresh();
  }, [refresh, syncDelete, syncRecord]);

  const removeFoodFromToday = useCallback(async (id: string) => {
    const current = await db.foodLogs.get(id);
    if (!current) return;
    if ((current.portionsLeft ?? 0) > 0) {
      const record: FoodLog = { ...current, hiddenFromToday: true };
      await db.foodLogs.put(record); await syncRecord('food_logs', record); await refresh();
      return;
    }
    await db.foodLogs.delete(id); await syncDelete('food_logs', id); await refresh();
  }, [refresh, syncDelete, syncRecord]);

  const deleteFoodLog = useCallback(async (id: string) => {
    await db.foodLogs.delete(id); await syncDelete('food_logs', id); await refresh();
  }, [refresh, syncDelete]);

  const addFoodDecision = useCallback(async (decision: CreateFoodDecisionInput) => {
    const record: FoodDecision = { ...decision, ownerId: decision.ownerId ?? user?.id, scope: decision.scope ?? 'family', id: uid('decision'), createdAt: dateTimeISO() };
    await db.foodDecisions.add(record); await syncRecord('food_decisions', record); await refresh();
    if (record.status === 'decided' && record.decidedMeal) {
      await addFoodLog({
        sourceDecisionId: record.id,
        title: record.decidedMeal,
        mealType: record.mealType,
        eatenAt: record.mealDate,
        portionsLeft: 0,
        scope: record.scope,
        assigneeId: record.assigneeId,
        assigneeName: record.assigneeName,
        assigneeIds: record.assigneeIds,
        assigneeNames: record.assigneeNames
      });
    }
    return record;
  }, [addFoodLog, refresh, syncRecord, user?.id]);

  const updateFoodDecision = useCallback(async (decisionId: string, updater: (current: FoodDecision) => FoodDecision) => {
    const current = await db.foodDecisions.get(decisionId);
    if (!current) return;
    const record = updater(current);
    await db.foodDecisions.put(record); await syncRecord('food_decisions', record); await refresh();
    return record;
  }, [refresh, syncRecord]);

  const voteFoodOption = useCallback(async (decisionId: string, optionId: string) => {
    if (supabase && household?.id && user?.id) {
      const { data, error } = await supabase.rpc('vote_food_option', { p_decision_id: decisionId, p_option_id: optionId });
      if (!error && data) {
        await db.foodDecisions.put(data as FoodDecision);
        await refresh();
        return;
      }
      if (error && !error.message.includes('vote_food_option')) markCloudError(error);
    }
    await updateFoodDecision(decisionId, (current) => {
      if (current.eligibleVoterIds?.length && !current.eligibleVoterIds.includes(currentVoterId)) return current;
      return applyFoodVote(current, optionId, currentVoterId);
    });
  }, [currentVoterId, household?.id, markCloudError, refresh, updateFoodDecision, user?.id]);

  const addFoodVoteOption = useCallback(async (decisionId: string, title: string) => {
    if (!title.trim()) return;
    if (supabase && household?.id && user?.id) {
      const { data, error } = await supabase.rpc('add_food_vote_option', {
        p_decision_id: decisionId,
        p_title: title.trim(),
        p_suggested_by: currentVoterName
      });
      if (!error && data) {
        await db.foodDecisions.put(data as FoodDecision);
        await refresh();
        return;
      }
      if (error && !error.message.includes('add_food_vote_option')) markCloudError(error);
    }
    await updateFoodDecision(decisionId, (current) => {
      if (current.eligibleVoterIds?.length && !current.eligibleVoterIds.includes(currentVoterId)) return current;
      return appendFoodOption(current, title, currentVoterName);
    });
  }, [currentVoterId, currentVoterName, household?.id, markCloudError, refresh, updateFoodDecision, user?.id]);

  const decideFoodPoll = useCallback(async (decisionId: string, optionId?: string) => {
    let decision: FoodDecision | undefined;
    if (supabase && household?.id && user?.id && optionId) {
      const { data, error } = await supabase.rpc('decide_food_poll', { p_decision_id: decisionId, p_option_id: optionId });
      if (!error && data) {
        decision = data as FoodDecision;
        await db.foodDecisions.put(decision);
        await refresh();
      } else if (error && !error.message.includes('decide_food_poll')) {
        markCloudError(error);
      }
    }
    if (!decision) decision = await updateFoodDecision(decisionId, (current) => {
      if (current.ownerId && current.ownerId !== user?.id) return current;
      return decideFoodWinner(current, optionId);
    });
    if (!decision?.decidedMeal) return;
    const existing = await db.foodLogs.filter((food) => food.sourceDecisionId === decision.id).first();
    if (existing) return;
    await addFoodLog({
      sourceDecisionId: decision.id,
      title: decision.decidedMeal,
      mealType: decision.mealType,
      eatenAt: decision.mealDate,
      portionsLeft: 0,
      scope: decision.scope,
      assigneeId: decision.assigneeId,
      assigneeName: decision.assigneeName,
      assigneeIds: decision.assigneeIds,
      assigneeNames: decision.assigneeNames
    });
  }, [addFoodLog, household?.id, markCloudError, refresh, updateFoodDecision, user?.id]);

  const deleteFoodDecision = useCallback(async (id: string) => {
    await db.foodDecisions.delete(id); await syncDelete('food_decisions', id); await refresh();
  }, [refresh, syncDelete]);

  const acceptSuggestion = useCallback(async (suggestion: Suggestion, sourceEntryId?: string) => {
    const assignment = { assigneeId: suggestion.assigneeId, assigneeName: suggestion.assigneeName, assigneeIds: suggestion.assigneeIds, assigneeNames: suggestion.assigneeNames };
    if (suggestion.type === 'task') return addTask({ sourceEntryId, scope: suggestion.scope ?? 'personal', ...assignment, title: suggestion.title, dueDate: suggestion.dueDate, category: suggestion.category, priority: suggestion.priority });
    if (suggestion.type === 'event') return addEvent({ sourceEntryId, scope: suggestion.scope ?? 'personal', ...assignment, title: suggestion.title, startDate: suggestion.startDate, startTime: suggestion.startTime, location: suggestion.location, category: suggestion.category });
    if (suggestion.type === 'shopping') return addShoppingItem({ sourceEntryId, scope: suggestion.scope ?? 'personal', ...assignment, name: suggestion.name, quantity: suggestion.quantity, category: suggestion.category, barcode: suggestion.barcode, brand: suggestion.brand, imageUrl: suggestion.imageUrl });
    await addFoodLog({ sourceEntryId, scope: suggestion.scope ?? 'personal', ...assignment, title: suggestion.title, mealType: suggestion.mealType, eatenAt: suggestion.eatenAt, portionsLeft: suggestion.portionsLeft });
  }, [addEvent, addFoodLog, addShoppingItem, addTask]);

  const clearData = useCallback(async () => {
    await clearAllData();
    if (household?.id) await clearCloudSnapshot(household.id).catch(markCloudError);
    await refresh();
  }, [household?.id, markCloudError, refresh]);

  const value = useMemo<VardagDataContextValue>(() => ({
    ...snapshot, isLoading, cloudStatus, cloudError, currentVoterId, currentVoterName, notificationFrequency, setNotificationFrequency, refresh, syncNow,
    submitEntry, acceptSuggestion, addTask, toggleTask, deleteTask, addEvent, toggleEvent, deleteEvent,
    addShoppingItem, toggleShoppingItem, deleteShoppingItem, clearBoughtShoppingItems, addFoodLog, adjustFoodPortions, removeFoodFromToday, deleteFoodLog,
    addFoodDecision, voteFoodOption, addFoodVoteOption, decideFoodPoll, deleteFoodDecision,
    clearData
  }), [snapshot, isLoading, cloudStatus, cloudError, currentVoterId, currentVoterName, notificationFrequency, setNotificationFrequency, refresh, syncNow,
    submitEntry, acceptSuggestion, addTask, toggleTask, deleteTask, addEvent, toggleEvent, deleteEvent,
    addShoppingItem, toggleShoppingItem, deleteShoppingItem, clearBoughtShoppingItems, addFoodLog, adjustFoodPortions, removeFoodFromToday, deleteFoodLog,
    addFoodDecision, voteFoodOption, addFoodVoteOption, decideFoodPoll, deleteFoodDecision,
    clearData]);

  return <VardagDataContext.Provider value={value}>{children}</VardagDataContext.Provider>;
}

export const useVardagData = (): VardagDataContextValue => {
  const value = useContext(VardagDataContext);
  if (!value) throw new Error('useVardagData must be used inside VardagDataProvider');
  return value;
};
