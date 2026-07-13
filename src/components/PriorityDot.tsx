import type { Priority } from '../types/models';
import { useI18n } from '../app/I18nContext';
import { Text } from './Typography';

const priorityClasses: Record<Priority, string> = {
  high: 'bg-app-red',
  medium: 'bg-app-orange',
  low: 'bg-app-blue'
};

export function PriorityDot({ priority }: { priority: Priority }) {
  const { t } = useI18n();
  return (
    <Text as="span" className="inline-flex items-center gap-2 text-sm capitalize">
      <span className={`h-2.5 w-2.5 rounded-full ${priorityClasses[priority]}`} />
      {t(priority.slice(0, 1).toUpperCase() + priority.slice(1))}
    </Text>
  );
}
