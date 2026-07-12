import { Barcode, CheckCircle2, House, MoreHorizontal, Plus, Send, ShoppingCart, SlidersHorizontal, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useVardagData } from '../../app/VardagDataContext';
import { useI18n } from '../../app/I18nContext';
import { EmptyState } from '../../components/EmptyState';
import { EntrySheet } from '../../components/EntrySheet';
import { FormField } from '../../components/FormField';
import { GlassCard } from '../../components/GlassCard';
import { PageHeader } from '../../components/PageHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { ScopePicker } from '../../components/ScopePicker';
import { ShoppingItemRow } from '../../components/ShoppingItemRow';
import { ProductCaptureSheet, type ProductCaptureResult } from '../../components/ProductCaptureSheet';
import { ShoppingAttachment } from '../../components/ShoppingAttachment';
import { StatCard } from '../../components/StatCard';
import { StatsGrid } from '../../components/StatsGrid';
import { Text } from '../../components/Typography';
import type { SharingScope } from '../../types/models';
import { shoppingCategories } from '../../lib/shopping';
import { useAuth } from '../../app/AuthContext';
import { isRecordVisibleToUser } from '../../lib/recordVisibility';

const categories = shoppingCategories;

export function ShoppingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { shoppingItems, addShoppingItem, toggleShoppingItem, deleteShoppingItem, clearBoughtShoppingItems } = useVardagData();
  const [quickItem, setQuickItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [scopeFilter, setScopeFilter] = useState<SharingScope>('family');
  const [scope, setScope] = useState<SharingScope>('family');
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<'quick' | 'details'>('quick');
  const [quickCapture, setQuickCapture] = useState<ProductCaptureResult>();
  const [detailCapture, setDetailCapture] = useState<ProductCaptureResult>();

  const scopedShoppingItems = useMemo(
    () => shoppingItems.filter((item) => (item.scope ?? 'family') === scopeFilter && isRecordVisibleToUser(item, user?.id)),
    [scopeFilter, shoppingItems, user?.id]
  );
  const grouped = useMemo(
    () =>
      categories.map((category) => ({
        category,
        items: scopedShoppingItems.filter((item) => !item.isBought && (item.category ?? 'Other') === category)
      })),
    [scopedShoppingItems]
  );
  const boughtItems = scopedShoppingItems.filter((item) => item.isBought);

  const categoryIcon = (categoryName: string) => {
    if (categoryName === 'Groceries') return <ShoppingCart className="h-6 w-6 text-app-green" />;
    if (categoryName === 'Household') return <House className="h-5 w-5 text-app-active" />;
    return <MoreHorizontal className="h-5 w-5 text-app-purple" />;
  };

  const handleQuickAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quickItem.trim()) return;
    await addShoppingItem({
      name: quickItem.trim(),
      category: 'Groceries',
      scope: scopeFilter,
      barcode: quickCapture?.barcode,
      brand: quickCapture?.brand,
      imageUrl: quickCapture?.imageUrl
    });
    setQuickItem('');
    setQuickCapture(undefined);
  };

  const handleDetailedAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    await addShoppingItem({
      name: name.trim(),
      quantity: quantity.trim() || undefined,
      category,
      scope,
      barcode: detailCapture?.barcode,
      brand: detailCapture?.brand,
      imageUrl: detailCapture?.imageUrl,
      assigneeId: assignees[0]?.id,
      assigneeName: assignees[0]?.name,
      assigneeIds: assignees.map((member) => member.id),
      assigneeNames: assignees.map((member) => member.name)
    });
    setName('');
    setQuantity('');
    setCategory('Groceries');
    setScope('family');
    setAssignees([]);
    setDetailCapture(undefined);
    setIsAdding(false);
  };

  return (
    <>
      <PageHeader title={t('Shopping')} />
      <ScopePicker value={scopeFilter} onChange={setScopeFilter} className="mb-4" showLabel={false} />
      <form onSubmit={handleQuickAdd} className="accent-input mb-5 flex items-center gap-2 rounded-[1.35rem] border border-app-border p-2 pl-2.5">
        <button type="button" aria-label={t('Scan or photograph')} title={t('Scan or photograph')} className="quick-capture-button" onClick={() => { setCaptureTarget('quick'); setCaptureOpen(true); }}>
          <Barcode className="h-5 w-5" />
        </button>
        <input
          className="min-w-0 flex-1 bg-transparent text-base text-app-fg outline-none placeholder:text-app-muted"
          placeholder={t('Quick add item...')}
          value={quickItem}
          onChange={(event) => setQuickItem(event.target.value)}
        />
        <button
          type="submit"
          aria-label={t(quickItem.trim() ? 'Add item' : 'Add with details')}
          title={t(quickItem.trim() ? 'Add item' : 'Add with details')}
          className={`quick-send-button ${quickItem.trim() ? '' : 'quick-send-button--details'}`}
          onClick={(event) => {
            if (quickItem.trim()) return;
            event.preventDefault();
            setScope(scopeFilter);
            setAssignees([]);
            setIsAdding(true);
          }}
        >
          {quickItem.trim() ? <Send className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
        </button>
      </form>

      {quickCapture ? (
        <div className="-mt-3 mb-4 flex items-center gap-2 px-1">
          <ShoppingAttachment src={quickCapture.imageUrl} alt={quickCapture.name || t('Product photo')} onRemove={() => setQuickCapture((current) => current ? { ...current, imageUrl: undefined } : undefined)} />
          <Text className="min-w-0 flex-1 truncate text-xs">{[quickCapture.brand, quickCapture.barcode].filter(Boolean).join(' - ')}</Text>
        </div>
      ) : null}

      <StatsGrid>
        <StatCard icon={ShoppingCart} value={scopedShoppingItems.filter((item) => !item.isBought).length} label={t('To buy')} tone="green" compact />
        <StatCard icon={CheckCircle2} value={scopedShoppingItems.filter((item) => item.isBought).length} label={t('Bought')} tone="purple" compact />
      </StatsGrid>

      {grouped.filter(({ items }) => items.length > 0).map(({ category: groupCategory, items }, index) => (
        <GlassCard key={groupCategory} className="mb-4" variant={index === 0 ? 'flat' : 'quiet'}>
          <SectionHeader
            title={t(groupCategory)}
            icon={categoryIcon(groupCategory)}
            action={`${items.length} ${t(items.length === 1 ? 'item' : 'items')}`}
          />
          {items.map((item) => (
            <ShoppingItemRow key={item.id} item={item} onToggle={toggleShoppingItem} onDelete={deleteShoppingItem} />
          ))}
        </GlassCard>
      ))}

      {boughtItems.length > 0 ? (
        <GlassCard className="mb-5" variant="quiet">
          <SectionHeader
            title={t('Bought')}
            icon={<CheckCircle2 className="h-5 w-5 text-app-green" />}
            action={t('Clear')}
            actionIcon={<Trash2 className="h-4 w-4" />}
            onAction={() => void clearBoughtShoppingItems(scopeFilter)}
          />
          {boughtItems.map((item) => (
            <ShoppingItemRow key={item.id} item={item} onToggle={toggleShoppingItem} onDelete={deleteShoppingItem} />
          ))}
          </GlassCard>
      ) : null}

      {scopedShoppingItems.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={t('Your list is empty')} body={t('Add essentials from the quick field or Today parser.')} />
      ) : null}

      <EntrySheet
        isOpen={isAdding}
        title={t('New shopping item')}
        description={t('Add quantity and category before it reaches the list.')}
        icon={ShoppingCart}
        toneClass="text-app-green"
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleDetailedAdd} className="entry-sheet-form">
          <ScopePicker value={scope} onChange={setScope} allowAssignee assigneeIds={assignees.map((member) => member.id)} onAssigneesChange={setAssignees} />
          <FormField label={t('Item')}>
            <div className="form-control-with-action">
              <input placeholder={t('What do you need?')} value={name} onChange={(event) => setName(event.target.value)} autoFocus required />
              <button type="button" aria-label={t('Scan or photograph')} title={t('Scan or photograph')} onClick={() => { setCaptureTarget('details'); setCaptureOpen(true); }}><Barcode className="h-5 w-5" /></button>
            </div>
          </FormField>
          {detailCapture ? <ShoppingAttachment src={detailCapture.imageUrl} alt={detailCapture.name || name || t('Product photo')} onRemove={() => setDetailCapture((current) => current ? { ...current, imageUrl: undefined } : undefined)} /> : null}
          <FormField label={t('Quantity')} hint={t('Examples: 2 kg, 1 pack or 3 bottles')}>
            <input className="form-control" placeholder={t('Optional')} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </FormField>
          <FormField label={t('Category')}>
            <select className="form-control" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}
            </select>
          </FormField>
          <div className="entry-sheet-actions">
            <button type="button" className="secondary-button" onClick={() => setIsAdding(false)}>{t('Cancel')}</button>
            <button className="primary-button primary-button--green" type="submit">
              <Plus className="h-4 w-4" />
              {t('Add item')}
            </button>
          </div>
        </form>
      </EntrySheet>

      <ProductCaptureSheet
        isOpen={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onUse={(result) => {
          if (captureTarget === 'quick') {
            setQuickCapture(result);
            if (result.name) setQuickItem(result.name);
          } else {
            setDetailCapture(result);
            if (result.name) setName(result.name);
          }
        }}
      />
    </>
  );
}
