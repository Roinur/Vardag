import { CalendarDays, Tag, Trash2 } from 'lucide-react';
import type { Task } from '../types/models';
import { useI18n } from '../app/I18nContext';
import { formatShortDate, todayISO } from '../lib/utils';
import { CheckCircleButton } from './CheckCircleButton';
import { PriorityDot } from './PriorityDot';
import { Text } from './Typography';
import { ScopeMark } from './ScopeMark';

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete?: (id: string) => void;
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const { locale, t } = useI18n();
  const isDone = task.status === 'done';

  return (
    <div className="motion-row flex items-center gap-3 border-b border-app-contrast/10 py-3 last:border-b-0">
      <CheckCircleButton checked={isDone} label={t(isDone ? 'Mark task undone' : 'Mark task done')} onClick={() => onToggle(task)} />
      <div className="min-w-0 flex-1">
        <Text className={`truncate text-base font-medium text-app-fg ${isDone ? 'text-app-muted line-through' : ''}`}>
          {task.title}
        </Text>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {task.category ? (
            <Text as="span" className="inline-flex items-center gap-1 text-xs">
              <Tag className="h-3.5 w-3.5" />
              {t(task.category)}
            </Text>
          ) : null}
          {task.dueDate && task.dueDate !== todayISO() ? (
            <Text as="span" className="inline-flex items-center gap-1 text-xs">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatShortDate(task.dueDate, locale)}
            </Text>
          ) : null}
        </div>
      </div>
      <ScopeMark recordTitle={task.title} scope={task.scope} ownerId={task.ownerId} assigneeName={task.assigneeName} assigneeNames={task.assigneeNames} assigneeId={task.assigneeId} assigneeIds={task.assigneeIds} />
      <PriorityDot priority={task.priority} />
      {onDelete ? (
        <button
          type="button"
          aria-label={t('Delete task')}
          title={t('Delete task')}
          className="rounded-full p-2 text-app-muted transition hover:bg-app-contrast/10 hover:text-app-red"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
