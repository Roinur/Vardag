import { Apple, ChevronRight, Coffee, ForkKnife, Trash2 } from 'lucide-react';
import type { FoodLog } from '../types/models';
import { useI18n } from '../app/I18nContext';
import { formatShortDate } from '../lib/utils';
import { Text } from './Typography';
import { ScopeMark } from './ScopeMark';

interface FoodLogItemProps {
  food: FoodLog;
  onDelete?: (id: string) => void;
  showPortions?: boolean;
  compact?: boolean;
}

const foodThumbs = [
  'border-app-green/20 bg-app-green/10 text-app-green',
  'border-app-orange/20 bg-app-orange/10 text-app-orange',
  'border-app-purple/20 bg-app-purple/10 text-app-purple'
];

export function FoodLogItem({ food, onDelete, showPortions = true, compact = false }: FoodLogItemProps) {
  const { locale, t } = useI18n();
  const thumbClass = foodThumbs[food.title.length % foodThumbs.length];
  const ThumbIcon = food.mealType === 'breakfast' ? Coffee : food.mealType === 'snack' ? Apple : ForkKnife;

  return (
    <div className={`motion-row flex items-center border-b border-app-contrast/10 last:border-b-0 ${compact ? 'min-h-[4.5rem] gap-3 py-2' : 'gap-3 py-3'}`}>
      <div className={`grid shrink-0 place-items-center border shadow-innerGlow ${compact ? 'h-11 w-11 rounded-xl' : 'h-16 w-20 rounded-2xl'} ${thumbClass}`}>
        <ThumbIcon className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
      </div>
      <div className="min-w-0 flex-1">
        <Text className="truncate text-base font-medium text-app-fg">{food.title}</Text>
        <Text className="mt-1 text-sm capitalize">
          {[food.mealType ? t(food.mealType.slice(0, 1).toUpperCase() + food.mealType.slice(1)) : undefined, formatShortDate(food.eatenAt, locale)].filter(Boolean).join(' · ')}
        </Text>
        {food.notes ? <Text className="mt-0.5 text-sm text-app-green">{food.notes}</Text> : null}
        {showPortions && food.portionsLeft ? (
          <Text className="mt-0.5 text-sm text-app-purple">{food.portionsLeft} {t(food.portionsLeft === 1 ? 'portion left' : 'portions left')}</Text>
        ) : null}
      </div>
      <ScopeMark recordTitle={food.title} scope={food.scope} ownerId={food.ownerId} assigneeName={food.assigneeName} assigneeNames={food.assigneeNames} assigneeId={food.assigneeId} assigneeIds={food.assigneeIds} />
      {onDelete ? (
        <button
          type="button"
          aria-label={t('Delete food log')}
          title={t('Delete food log')}
          className="rounded-full p-2 text-app-muted transition hover:bg-app-contrast/10 hover:text-app-red"
          onClick={() => onDelete(food.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <ChevronRight className="h-5 w-5 text-app-muted" />
      )}
    </div>
  );
}
