import type { AppStateSnapshot } from '../types/models';
import { supabase } from './supabase';

export type CloudEntityType = 'entries' | 'tasks' | 'events' | 'shopping_items' | 'food_logs' | 'food_decisions';

const collectionMap: Record<CloudEntityType, keyof AppStateSnapshot> = {
  entries: 'entries',
  tasks: 'tasks',
  events: 'events',
  shopping_items: 'shoppingItems',
  food_logs: 'foodLogs',
  food_decisions: 'foodDecisions'
};

export const pushCloudRecord = async (
  householdId: string | undefined,
  userId: string | undefined,
  entityType: CloudEntityType,
  record: { id: string; ownerId?: string; scope?: string }
): Promise<void> => {
  if (!supabase || !householdId || !userId) return;
  const { error } = await supabase.from('vardag_records').upsert({
    household_id: householdId,
    owner_id: record.ownerId ?? userId,
    entity_type: entityType,
    record_id: record.id,
    payload: record,
    updated_at: new Date().toISOString()
  }, { onConflict: 'household_id,entity_type,record_id' });
  if (error) throw error;
};

export const deleteCloudRecord = async (
  householdId: string | undefined,
  entityType: CloudEntityType,
  recordId: string
): Promise<void> => {
  if (!supabase || !householdId) return;
  const { error } = await supabase
    .from('vardag_records')
    .delete()
    .eq('household_id', householdId)
    .eq('entity_type', entityType)
    .eq('record_id', recordId);
  if (error) throw error;
};

export const pushCloudSnapshot = async (
  householdId: string,
  userId: string,
  snapshot: AppStateSnapshot
): Promise<void> => {
  if (!supabase) return;
  const rows = (Object.entries(collectionMap) as Array<[CloudEntityType, keyof AppStateSnapshot]>).flatMap(
    ([entityType, collection]) => snapshot[collection].map((record) => ({
      household_id: householdId,
      owner_id: record.ownerId ?? userId,
      entity_type: entityType,
      record_id: record.id,
      payload: record,
      updated_at: new Date().toISOString()
    }))
  );
  if (rows.length === 0) return;
  const { error } = await supabase.from('vardag_records').upsert(rows, {
    onConflict: 'household_id,entity_type,record_id'
  });
  if (error) throw error;
};

export const clearCloudSnapshot = async (householdId: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('vardag_records').delete().eq('household_id', householdId);
  if (error) throw error;
};

export const pullCloudSnapshot = async (householdId: string): Promise<AppStateSnapshot | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('vardag_records')
    .select('entity_type,payload,owner_id')
    .eq('household_id', householdId);
  if (error) throw error;
  if (!data?.length) return null;

  const snapshot: AppStateSnapshot = {
    entries: [],
    tasks: [],
    events: [],
    shoppingItems: [],
    foodLogs: [],
    foodDecisions: []
  };

  for (const row of data) {
    const collection = collectionMap[row.entity_type as CloudEntityType];
    const record = row.payload as { id?: string; ownerId?: string } | null;
    if (!collection || !record?.id) continue;
    record.ownerId = row.owner_id;
    (snapshot[collection] as Array<unknown>).push(record);
  }
  return snapshot;
};
