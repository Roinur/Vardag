import type { AppStateSnapshot } from '../types/models';
import { supabase } from './supabase';

export type CloudEntityType = 'entries' | 'tasks' | 'events' | 'shopping_items' | 'food_logs' | 'food_decisions';

export const collectionMap: Record<CloudEntityType, keyof AppStateSnapshot> = {
  entries: 'entries',
  tasks: 'tasks',
  events: 'events',
  shopping_items: 'shoppingItems',
  food_logs: 'foodLogs',
  food_decisions: 'foodDecisions'
};

export interface CloudMutation {
  entityType: CloudEntityType;
  recordId: string;
  operation: 'upsert' | 'delete' | 'completion' | 'vote' | 'add_vote_option' | 'decide_vote';
  payload?: Record<string, unknown>;
  ownerId?: string;
  clientUpdatedAt: string;
  completed?: boolean;
  optionId?: string;
  title?: string;
  suggestedBy?: string;
}

export interface CloudState {
  snapshot: AppStateSnapshot;
  recordIds: Set<string>;
}

export const applyCloudMutation = async (householdId: string, mutation: CloudMutation): Promise<void> => {
  if (!supabase) return;
  if (mutation.operation === 'completion') {
    const { error } = await supabase.rpc('apply_vardag_completion', {
      p_household_id: householdId,
      p_entity_type: mutation.entityType,
      p_record_id: mutation.recordId,
      p_completed: Boolean(mutation.completed),
      p_client_updated_at: mutation.clientUpdatedAt
    });
    if (error) throw error;
    return;
  }
  if (mutation.operation === 'vote' || mutation.operation === 'add_vote_option' || mutation.operation === 'decide_vote') {
    const fn = mutation.operation === 'vote' ? 'vote_food_option' : mutation.operation === 'add_vote_option' ? 'add_food_vote_option' : 'decide_food_poll';
    const args = mutation.operation === 'vote'
      ? { p_decision_id: mutation.recordId, p_option_id: mutation.optionId }
      : mutation.operation === 'add_vote_option'
        ? { p_decision_id: mutation.recordId, p_title: mutation.title, p_suggested_by: mutation.suggestedBy }
        : { p_decision_id: mutation.recordId, p_option_id: mutation.optionId };
    const { error } = await supabase.rpc(fn, args);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.rpc('apply_vardag_mutation', {
    p_household_id: householdId,
    p_entity_type: mutation.entityType,
    p_record_id: mutation.recordId,
    p_owner_id: mutation.ownerId ?? null,
    p_payload: mutation.payload ?? null,
    p_client_updated_at: mutation.clientUpdatedAt,
    p_deleted: mutation.operation === 'delete'
  });
  if (error) throw error;
};

export const pullCloudState = async (householdId: string): Promise<CloudState> => {
  const snapshot: AppStateSnapshot = { entries: [], tasks: [], events: [], shoppingItems: [], foodLogs: [], foodDecisions: [] };
  const recordIds = new Set<string>();
  if (!supabase) return { snapshot, recordIds };
  const { data, error } = await supabase
    .from('vardag_records')
    .select('entity_type,record_id,payload,owner_id,deleted_at,client_updated_at')
    .eq('household_id', householdId);
  if (error) throw error;

  for (const row of data ?? []) {
    const entityType = row.entity_type as CloudEntityType;
    const collection = collectionMap[entityType];
    const key = `${entityType}:${row.record_id}`;
    if (!collection) continue;
    recordIds.add(key);
    if (row.deleted_at) continue;
    const record = row.payload as Record<string, unknown> | null;
    if (!record?.id) continue;
    record.ownerId = row.owner_id;
    record.updatedAt = row.client_updated_at;
    (snapshot[collection] as Array<unknown>).push(record);
  }
  return { snapshot, recordIds };
};
