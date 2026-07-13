import { CalendarDays, Check, Clock3, ForkKnife, Hash, Pencil, ShoppingCart, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MealType, Priority, Suggestion, SuggestionType } from '../types/models';
import { useI18n } from '../app/I18nContext';
import { formatShortDate, todayISO } from '../lib/utils';
import { shoppingCategories } from '../lib/shopping';
import { FormField } from './FormField';
import { GlassCard } from './GlassCard';
import { SlidingControl } from './SlidingControl';
import { ScopePicker } from './ScopePicker';
import { Text } from './Typography';
import { CategoryPicker } from './CategoryPicker';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAccept: (suggestion: Suggestion) => void;
  onIgnore: (id: string) => void;
  confirmingFamily?: boolean;
}

const suggestionMeta = {
  task: { label: 'Task', icon: Check, color: 'text-app-active' },
  event: { label: 'Event', icon: CalendarDays, color: 'text-app-purple' },
  shopping: { label: 'Shopping', icon: ShoppingCart, color: 'text-app-green' },
  food: { label: 'Food', icon: ForkKnife, color: 'text-app-orange' }
};

const suggestionTypes: SuggestionType[] = ['task', 'event', 'shopping', 'food'];

const suggestionTitle = (suggestion: Suggestion): string =>
  suggestion.type === 'shopping' ? suggestion.name : suggestion.title;

const suggestionDate = (suggestion: Suggestion): string | undefined => {
  if (suggestion.type === 'task') return suggestion.dueDate;
  if (suggestion.type === 'event') return suggestion.startDate;
  if (suggestion.type === 'food') return suggestion.eatenAt;
  return undefined;
};

const suggestionCategory = (suggestion: Suggestion): string | undefined =>
  suggestion.type === 'food' ? undefined : suggestion.category;

export const convertSuggestion = (suggestion: Suggestion, type: SuggestionType): Suggestion => {
  if (suggestion.type === type) return suggestion;
  const title = suggestionTitle(suggestion);
  const date = suggestionDate(suggestion) ?? todayISO();
  const category = suggestionCategory(suggestion);
  const plannerCategory = suggestion.type === 'shopping' ? undefined : category;
  const shoppingCategory = suggestion.type === 'shopping' ? category : 'Other';
  const scope = suggestion.scope ?? 'family';
  const assignment = { assigneeId: suggestion.assigneeId, assigneeName: suggestion.assigneeName, assigneeIds: suggestion.assigneeIds, assigneeNames: suggestion.assigneeNames };

  if (type === 'task') {
    return { id: suggestion.id, type, title, dueDate: date, category: plannerCategory, priority: 'medium', scope, ...assignment };
  }
  if (type === 'event') {
    return { id: suggestion.id, type, title, startDate: date, category: plannerCategory, scope, ...assignment };
  }
  if (type === 'shopping') {
    return { id: suggestion.id, type, name: title, category: shoppingCategory ?? 'Other', scope, ...assignment };
  }
  return { id: suggestion.id, type, title, eatenAt: date, mealType: 'other', scope, ...assignment };
};

export function SuggestionCard({ suggestion, onAccept, onIgnore, confirmingFamily = false }: SuggestionCardProps) {
  const { locale, t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Suggestion>(suggestion);
  const meta = suggestionMeta[draft.type];
  const Icon = meta.icon;

  const summary = useMemo(() => {
    if (draft.type === 'task') return [draft.category ? t(draft.category) : undefined, t(draft.priority.slice(0, 1).toUpperCase() + draft.priority.slice(1))].filter(Boolean).join(' - ');
    if (draft.type === 'event') return draft.location;
    if (draft.type === 'shopping') return t(draft.category ?? 'Shopping');
    return draft.mealType ? t(draft.mealType.slice(0, 1).toUpperCase() + draft.mealType.slice(1)) : undefined;
  }, [draft, t]);

  const valid = suggestionTitle(draft).trim().length > 0;

  return (
    <GlassCard className={`mb-3 detected-card ${confirmingFamily ? 'is-family-sent' : ''}`} padded>
      {isEditing ? (
        <>
          <Text className="mb-1.5 text-xs font-semibold text-app-fg">{t('Card type')}</Text>
          <div className="grid grid-cols-[2.65rem_minmax(0,1fr)] items-center gap-2">
            <div className="grid h-full place-items-center">
              <div className={`grid h-9 w-9 place-items-center rounded-full border border-app-contrast/15 bg-app-contrast/5 ${meta.color}`}>
                <Icon className="h-[1.125rem] w-[1.125rem]" />
              </div>
            </div>
            <TypePicker value={draft.type} onChange={(type) => setDraft((current) => convertSuggestion(current, type))} />
          </div>
          <ScopePicker
            value={draft.scope ?? 'family'}
            onChange={(scope) => setDraft((current) => ({
              ...current,
              scope,
              ...(scope === 'personal' ? { assigneeId: undefined, assigneeName: undefined, assigneeIds: [], assigneeNames: [] } : {})
            }))}
            assigneeIds={draft.assigneeIds ?? (draft.assigneeId ? [draft.assigneeId] : [])}
            onAssigneesChange={(members) => setDraft((current) => ({
              ...current,
              assigneeId: members[0]?.id,
              assigneeName: members[0]?.name,
              assigneeIds: members.map((member) => member.id),
              assigneeNames: members.map((member) => member.name)
            }))}
            className="mt-3"
            compact
            allowAssignee
          />
          <SuggestionEditor draft={draft} onChange={setDraft} />
        </>
      ) : (
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-app-contrast/15 bg-app-contrast/5 ${meta.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Text className={`text-xs font-semibold uppercase ${meta.color}`}>{t(meta.label)}</Text>
            </div>
              <InterpretationPreview draft={draft} onChange={setDraft} />
              {summary ? <Text className="mt-0.5 text-sm">{summary}</Text> : null}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!valid}
          className="inline-flex items-center justify-center gap-1 rounded-full border border-app-green/30 bg-app-green/10 px-2 py-2 text-sm font-medium text-app-green disabled:opacity-40"
          onClick={() => onAccept(draft)}
        >
          <Check className="h-4 w-4" />
          {t('Add')}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 rounded-full border border-app-contrast/15 bg-app-contrast/5 px-2 py-2 text-sm font-medium text-app-muted"
          onClick={() => setIsEditing((value) => !value)}
        >
          {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {t(isEditing ? 'Done' : 'Edit')}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 rounded-full border border-app-red/30 bg-app-red/10 px-2 py-2 text-sm font-medium text-app-red"
          onClick={() => onIgnore(suggestion.id)}
        >
          <Trash2 className="h-4 w-4" />
          {t('Ignore')}
        </button>
      </div>
    </GlassCard>
  );
}

type InterpretedPart = 'date' | 'time' | 'quantity' | 'person';

function InterpretationPreview({ draft, onChange }: { draft: Suggestion; onChange: (suggestion: Suggestion) => void }) {
  const { locale, t } = useI18n();
  const [activePart, setActivePart] = useState<InterpretedPart>();
  const person = draft.assigneeNames?.join(', ') || draft.assigneeName || t((draft.scope ?? 'family') === 'family' ? 'Family' : 'Personal');
  const parts: Array<{ key: InterpretedPart; label: string; tone: string; icon: typeof CalendarDays }> = [];
  if (draft.type === 'task' && draft.dueDate) parts.push({ key: 'date', label: formatShortDate(draft.dueDate, locale), tone: 'date', icon: CalendarDays });
  if (draft.type === 'event') {
    parts.push({ key: 'date', label: formatShortDate(draft.startDate, locale), tone: 'date', icon: CalendarDays });
    if (draft.startTime) parts.push({ key: 'time', label: draft.startTime, tone: 'time', icon: Clock3 });
  }
  if (draft.type === 'shopping' && draft.quantity) parts.push({ key: 'quantity', label: draft.quantity, tone: 'quantity', icon: Hash });
  if (draft.type === 'food') {
    parts.push({ key: 'date', label: formatShortDate(draft.eatenAt, locale), tone: 'date', icon: CalendarDays });
    if (draft.portionsLeft !== undefined) parts.push({ key: 'quantity', label: `${draft.portionsLeft} ${t('left')}`, tone: 'quantity', icon: Hash });
  }
  parts.push({ key: 'person', label: person, tone: 'person', icon: UserRound });

  const setAssignees = (members: Array<{ id: string; name: string }>) => onChange({
    ...draft,
    assigneeId: members[0]?.id,
    assigneeName: members[0]?.name,
    assigneeIds: members.map((member) => member.id),
    assigneeNames: members.map((member) => member.name)
  });

  return (
    <>
      <div className="interpretation-line">
        <Text as="span" className="interpretation-title">{suggestionTitle(draft)}</Text>
        {parts.map((part) => {
          const PartIcon = part.icon;
          return <button key={part.key} type="button" className={`interpretation-token interpretation-token--${part.tone} ${activePart === part.key ? 'is-active' : ''}`} onClick={() => setActivePart((current) => current === part.key ? undefined : part.key)}><PartIcon className="h-3.5 w-3.5" /><span>{part.label}</span></button>;
        })}
      </div>
      {activePart ? (
        <div className="interpretation-correction">
          {activePart === 'date' && draft.type === 'task' ? <input aria-label={t('Due date')} className="form-control" type="date" value={draft.dueDate ?? ''} onChange={(event) => onChange({ ...draft, dueDate: event.target.value || undefined })} /> : null}
          {activePart === 'date' && draft.type === 'event' ? <input aria-label={t('Date')} className="form-control" type="date" value={draft.startDate} onChange={(event) => onChange({ ...draft, startDate: event.target.value })} /> : null}
          {activePart === 'date' && draft.type === 'food' ? <input aria-label={t('Date')} className="form-control" type="date" value={draft.eatenAt} onChange={(event) => onChange({ ...draft, eatenAt: event.target.value })} /> : null}
          {activePart === 'time' && draft.type === 'event' ? <input aria-label={t('Time')} className="form-control" type="time" value={draft.startTime ?? ''} onChange={(event) => onChange({ ...draft, startTime: event.target.value || undefined })} /> : null}
          {activePart === 'quantity' && draft.type === 'shopping' ? <input aria-label={t('Quantity')} className="form-control" value={draft.quantity ?? ''} onChange={(event) => onChange({ ...draft, quantity: event.target.value || undefined })} autoFocus /> : null}
          {activePart === 'quantity' && draft.type === 'food' ? <input aria-label={t('Portions left')} className="form-control" type="number" min="0" value={draft.portionsLeft ?? ''} onChange={(event) => onChange({ ...draft, portionsLeft: event.target.value ? Number(event.target.value) : undefined })} autoFocus /> : null}
          {activePart === 'person' ? <ScopePicker value={draft.scope ?? 'family'} onChange={(scope) => onChange({ ...draft, scope, ...(scope === 'personal' ? { assigneeId: undefined, assigneeName: undefined, assigneeIds: [], assigneeNames: [] } : {}) })} assigneeIds={draft.assigneeIds ?? (draft.assigneeId ? [draft.assigneeId] : [])} onAssigneesChange={setAssignees} compact allowAssignee showLabel={false} /> : null}
        </div>
      ) : null}
    </>
  );
}

function TypePicker({ value, onChange }: { value: SuggestionType; onChange: (type: SuggestionType) => void }) {
  const { t } = useI18n();
  return (
    <SlidingControl
      value={value}
      options={suggestionTypes.map((type) => ({
        value: type,
        label: t(suggestionMeta[type].label),
        icon: suggestionMeta[type].icon,
        activeClassName: suggestionMeta[type].color
      }))}
      onChange={onChange}
      ariaLabel={t('Card type')}
      compact
    />
  );
}

function SuggestionEditor({ draft, onChange }: { draft: Suggestion; onChange: (suggestion: Suggestion) => void }) {
  const { t } = useI18n();
  if (draft.type === 'shopping') {
    return (
      <div className="mt-3 grid gap-3">
        <FormField label={t('Item')}>
          <input className="form-control" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label={t('Quantity')}>
            <input className="form-control" value={draft.quantity ?? ''} onChange={(event) => onChange({ ...draft, quantity: event.target.value || undefined })} />
          </FormField>
          <FormField label={t('Category')}>
            <select className="form-control" value={draft.category ?? 'Other'} onChange={(event) => onChange({ ...draft, category: event.target.value })}>
              {shoppingCategories.map((category) => <option key={category} value={category}>{t(category)}</option>)}
            </select>
          </FormField>
        </div>
      </div>
    );
  }

  if (draft.type === 'task') {
    return (
      <div className="mt-3 grid gap-3">
        <FormField label={t('Task')}>
          <input className="form-control" value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label={t('Due date')}>
            <input className="form-control" type="date" value={draft.dueDate ?? ''} onChange={(event) => onChange({ ...draft, dueDate: event.target.value || undefined })} />
          </FormField>
          <FormField label={t('Priority')}>
            <select className="form-control" value={draft.priority} onChange={(event) => onChange({ ...draft, priority: event.target.value as Priority })}>
              <option value="low">{t('Low')}</option>
              <option value="medium">{t('Medium')}</option>
              <option value="high">{t('High')}</option>
            </select>
          </FormField>
        </div>
        <FormField label={t('Category')}>
          <CategoryPicker value={draft.category ?? ''} onChange={(category) => onChange({ ...draft, category: category || undefined })} />
        </FormField>
      </div>
    );
  }

  if (draft.type === 'event') {
    return (
      <div className="mt-3 grid gap-3">
        <FormField label={t('Event')}>
          <input className="form-control" value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label={t('Date')}>
            <input className="form-control" type="date" value={draft.startDate} onChange={(event) => onChange({ ...draft, startDate: event.target.value })} />
          </FormField>
          <FormField label={t('Time')}>
            <input className="form-control" type="time" value={draft.startTime ?? ''} onChange={(event) => onChange({ ...draft, startTime: event.target.value || undefined })} />
          </FormField>
        </div>
        <FormField label={t('Location')}>
          <input className="form-control" value={draft.location ?? ''} onChange={(event) => onChange({ ...draft, location: event.target.value || undefined })} />
        </FormField>
        <FormField label={t('Category')}>
          <CategoryPicker value={draft.category ?? ''} onChange={(category) => onChange({ ...draft, category: category || undefined })} />
        </FormField>
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3">
      <FormField label={t('Meal')}>
        <input className="form-control" value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
      </FormField>
      <div className="grid grid-cols-2 gap-2">
        <FormField label={t('Meal type')}>
          <select className="form-control" value={draft.mealType ?? 'other'} onChange={(event) => onChange({ ...draft, mealType: event.target.value as MealType })}>
            <option value="breakfast">{t('Breakfast')}</option>
            <option value="lunch">{t('Lunch')}</option>
            <option value="dinner">{t('Dinner')}</option>
            <option value="snack">{t('Snack')}</option>
            <option value="other">{t('Other')}</option>
          </select>
        </FormField>
        <FormField label={t('Date')}>
          <input className="form-control" type="date" value={draft.eatenAt} onChange={(event) => onChange({ ...draft, eatenAt: event.target.value })} />
        </FormField>
      </div>
      <FormField label={t('Portions left')}>
        <input className="form-control" type="number" min="0" value={draft.portionsLeft ?? ''} onChange={(event) => onChange({ ...draft, portionsLeft: event.target.value ? Number(event.target.value) : undefined })} />
      </FormField>
    </div>
  );
}
