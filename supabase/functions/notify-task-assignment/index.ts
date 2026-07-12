import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authorization } } }
    );
    const token = authorization.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return new Response('Unauthorized', { status: 401, headers: cors });

    const { taskId } = await request.json() as { taskId?: string };
    if (!taskId) return new Response('Missing taskId', { status: 400, headers: cors });
    const { data: record, error: recordError } = await supabase
      .from('vardag_records')
      .select('household_id,owner_id,payload')
      .eq('entity_type', 'tasks')
      .eq('record_id', taskId)
      .eq('owner_id', user.id)
      .single();
    if (recordError || !record) return new Response('Task not found', { status: 404, headers: cors });

    const payload = record.payload as { title?: string; scope?: string; assigneeId?: string; assigneeIds?: string[] };
    if (payload.scope !== 'family') return new Response('ok', { headers: cors });
    const explicitRecipients = payload.assigneeIds?.length ? payload.assigneeIds : payload.assigneeId ? [payload.assigneeId] : [];
    let recipientIds = explicitRecipients;
    if (!recipientIds.length) {
      const { data: members } = await supabase.from('household_members').select('user_id').eq('household_id', record.household_id);
      recipientIds = (members ?? []).map((member) => String(member.user_id));
    }
    recipientIds = [...new Set(recipientIds)].filter((id) => id !== user.id);
    if (!recipientIds.length) return new Response('ok', { headers: cors });

    const [{ data: subscriptions }, { data: sender }] = await Promise.all([
      supabase.from('push_subscriptions').select('endpoint,p256dh,auth').eq('household_id', record.household_id).in('user_id', recipientIds),
      supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
    ]);

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@vardag.app',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    );
    const notification = JSON.stringify({
      title: 'Ny uppgift',
      body: `${payload.title ?? 'Ny uppgift'}\nFrån: ${sender?.display_name ?? 'Familjemedlem'}`,
      tag: `task-${taskId}`,
      url: '/?page=tasks'
    });
    await Promise.allSettled((subscriptions ?? []).map((subscription) => webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth }
    }, notification)));
    return new Response('ok', { headers: { ...cors, 'Content-Type': 'text/plain' } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Push failed', { status: 500, headers: cors });
  }
});
