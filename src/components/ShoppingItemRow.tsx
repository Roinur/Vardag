import { ChevronRight, Trash2 } from 'lucide-react';
import type { ShoppingItem } from '../types/models';
import { useI18n } from '../app/I18nContext';
import { CheckCircleButton } from './CheckCircleButton';
import { Text } from './Typography';
import { ScopeMark } from './ScopeMark';
import { ShoppingAttachment } from './ShoppingAttachment';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onDelete?: (id: string) => void;
}

export function ShoppingItemRow({ item, onToggle, onDelete }: ShoppingItemRowProps) {
  const { t } = useI18n();
  return (
    <div className="motion-row flex items-center gap-3 border-b border-app-contrast/10 py-3 last:border-b-0">
      <CheckCircleButton
        checked={item.isBought}
        label={t(item.isBought ? 'Mark item to buy' : 'Mark item bought')}
        onClick={() => onToggle(item)}
      />
      <ShoppingAttachment src={item.imageUrl} alt={item.name} />
      <Text className={`min-w-0 flex-1 truncate text-base font-medium text-app-fg ${item.isBought ? 'text-app-muted line-through' : ''}`}>
        {item.name}
      </Text>
      {item.quantity ? <Text className="shrink-0 text-sm">{item.quantity}</Text> : null}
      <ScopeMark recordTitle={item.name} scope={item.scope} ownerId={item.ownerId} assigneeName={item.assigneeName} assigneeNames={item.assigneeNames} assigneeId={item.assigneeId} assigneeIds={item.assigneeIds} />
      {onDelete ? (
        <button
          type="button"
          aria-label={t('Delete item')}
          title={t('Delete item')}
          className="rounded-full p-2 text-app-muted transition hover:bg-app-contrast/10 hover:text-app-red"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <ChevronRight className="h-5 w-5 text-app-muted" />
      )}
    </div>
  );
}
