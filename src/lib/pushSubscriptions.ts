import type { Task } from '../types/models';
import { supabase } from './supabase';

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();

const decodeVapidKey = (value: string): ArrayBuffer => {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
};

export const registerPushSubscription = async (householdId: string): Promise<void> => {
  if (!supabase || !vapidPublicKey || Notification.permission !== 'granted' || !('PushManager' in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeVapidKey(vapidPublicKey)
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    household_id: householdId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    updated_at: new Date().toISOString()
  }, { onConflict: 'endpoint' });
  if (error) throw error;
};

export const sendTaskAssignmentPush = async (task: Task): Promise<void> => {
  if (!supabase || !vapidPublicKey || task.scope !== 'family') return;
  const { error } = await supabase.functions.invoke('notify-task-assignment', { body: { taskId: task.id } });
  if (error) throw error;
};
