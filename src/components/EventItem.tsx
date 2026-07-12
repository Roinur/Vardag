import { ChevronRight, MapPin, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '../types/models';
import { useI18n } from '../app/I18nContext';
import { Text } from './Typography';
import { ScopeMark } from './ScopeMark';

interface EventItemProps {
  event: CalendarEvent;
  onDelete?: (id: string) => void;
}

const categoryTone = (category?: string): string => {
  const normalized = category?.toLowerCase() ?? '';
  if (normalized.includes('health')) return 'border-app-green/35 bg-app-green/10 text-app-green';
  if (normalized.includes('leisure')) return 'border-app-orange/35 bg-app-orange/10 text-app-orange';
  return 'border-app-purple/35 bg-app-purple/10 text-app-purple';
};

export function EventItem({ event, onDelete }: EventItemProps) {
  const { t } = useI18n();
  return (
    <div className="motion-row flex items-center gap-3 border-b border-app-contrast/10 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Text className="truncate text-base font-medium text-app-fg">{event.title}</Text>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {event.location ? (
            <Text as="span" className="inline-flex min-w-0 items-center gap-1 text-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </Text>
          ) : null}
          {event.category ? (
            <Text as="span" className={`rounded-full px-2 py-0.5 text-xs ${categoryTone(event.category)}`}>
              {t(event.category)}
            </Text>
          ) : null}
        </div>
      </div>
      <ScopeMark recordTitle={event.title} scope={event.scope} ownerId={event.ownerId} assigneeName={event.assigneeName} assigneeNames={event.assigneeNames} assigneeId={event.assigneeId} assigneeIds={event.assigneeIds} />
      <div className="shrink-0 text-right">
        {event.startTime ? <Text className="text-base">{event.startTime}</Text> : null}
      </div>
      {onDelete ? (
        <button
          type="button"
          aria-label={t('Delete event')}
          title={t('Delete event')}
          className="rounded-full p-2 text-app-muted transition hover:bg-app-contrast/10 hover:text-app-red"
          onClick={() => onDelete(event.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <ChevronRight className="h-5 w-5 text-app-muted" />
      )}
    </div>
  );
}
