import type { Task } from '../types/models';

const getRegistration = async () => 'serviceWorker' in navigator ? navigator.serviceWorker.ready : undefined;

export const showNewTaskNotification = async (task: Task, sender: string, labels: { title: string; from: string }) => {
  if (Notification.permission !== 'granted') return;
  const worker = await getRegistration();
  await worker?.showNotification(labels.title, {
    body: `${task.title}\n${labels.from}: ${sender}`,
    icon: '/icon-192-maskable.png', badge: '/notification-badge.png', tag: `task-${task.id}`,
    data: { url: '/?page=tasks' }
  });
};

export const updateTodayNotification = async (tasks: Task[], labels: { title: string }) => {
  if (Notification.permission !== 'granted') return;
  const worker = await getRegistration();
  if (!worker) return;
  (await worker.getNotifications({ tag: 'vardag-today' })).forEach((notification) => notification.close());
  if (!tasks.length) return;
  await worker.showNotification(labels.title, {
    body: tasks.slice(0, 3).map((task) => `• ${task.title}`).join('\n'),
    icon: '/icon-192-maskable.png', badge: '/notification-badge.png', tag: 'vardag-today',
    data: { url: '/?page=tasks' }
  });
};
