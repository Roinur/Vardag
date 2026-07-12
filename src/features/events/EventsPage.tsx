import { CalendarDays, Plus } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useVardagData } from '../../app/VardagDataContext';
import { useI18n } from '../../app/I18nContext';
import { EmptyState } from '../../components/EmptyState';
import { CategoryPicker } from '../../components/CategoryPicker';
import { EntrySheet } from '../../components/EntrySheet';
import { EventItem } from '../../components/EventItem';
import { FormField } from '../../components/FormField';
import { GlassCard } from '../../components/GlassCard';
import { PageHeader } from '../../components/PageHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { ScopePicker } from '../../components/ScopePicker';
import { Text } from '../../components/Typography';
import { addDays, todayISO, toISODate } from '../../lib/utils';
import type { RepeatRule, SharingScope } from '../../types/models';
import { occursOnDate } from '../../lib/recurrence';
import { useAuth } from '../../app/AuthContext';
import { isRecordVisibleToUser } from '../../lib/recordVisibility';

export function EventsPage() {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const { events, addEvent, deleteEvent } = useVardagData();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [startTime, setStartTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Personal');
  const [repeat, setRepeat] = useState<RepeatRule>('none');
  const [scope, setScope] = useState<SharingScope>('family');
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [scopeFilter, setScopeFilter] = useState<SharingScope>('family');

  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(new Date(), index);
        return {
          iso: toISODate(date),
          day: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace('.', '').toUpperCase(),
          date: date.getDate()
        };
      }),
    [locale]
  );

  const scopedEvents = useMemo(() => events.filter((event) => (event.scope ?? 'family') === scopeFilter && isRecordVisibleToUser(event, user?.id)), [events, scopeFilter, user?.id]);
  const selectedEvents = scopedEvents.filter((event) => !event.isCompleted && occursOnDate(event.startDate, event.repeat, selectedDate));
  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    await addEvent({
      title: title.trim(),
      startDate,
      startTime: startTime || undefined,
      location: location.trim() || undefined,
      category: category.trim() || undefined,
      repeat,
      scope,
      assigneeId: assignees[0]?.id,
      assigneeName: assignees[0]?.name,
      assigneeIds: assignees.map((member) => member.id),
      assigneeNames: assignees.map((member) => member.name)
    });
    setTitle('');
    setStartDate(selectedDate);
    setStartTime('18:00');
    setLocation('');
    setCategory('Personal');
    setRepeat('none');
    setScope('family');
    setAssignees([]);
    setIsAdding(false);
  };

  return (
    <>
      <PageHeader title={t('Events')} />
      <ScopePicker value={scopeFilter} onChange={setScopeFilter} className="mb-4" showLabel={false} />
      <GlassCard className="mb-5" padded={false}>
        <div className="grid grid-cols-7 px-2 py-4">
          {weekDays.map((day) => {
            const active = day.iso === selectedDate;
            const isToday = day.iso === today;
            const hasEvent = scopedEvents.some((event) => !event.isCompleted && occursOnDate(event.startDate, event.repeat, day.iso));
            return (
              <button
                key={day.iso}
                type="button"
                aria-label={`${t('Show events for')} ${day.day} ${day.date}`}
                aria-pressed={active}
                className="calendar-day flex min-w-0 flex-col items-center gap-2 rounded-2xl py-1"
                onClick={() => {
                  setSelectedDate(day.iso);
                  setStartDate(day.iso);
                }}
              >
                <Text as="span" className="text-[0.68rem] font-semibold uppercase">
                  {day.day}
                </Text>
                <span
                  className={[
                    'grid h-11 w-11 place-items-center rounded-full border text-lg font-semibold transition-colors',
                    active
                      ? 'border-app-active/60 bg-app-active/20 text-app-fg'
                      : isToday
                        ? 'border-app-contrast/20 text-app-fg'
                        : 'border-transparent text-app-fg'
                  ].join(' ')}
                >
                  {day.date}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${hasEvent ? 'bg-app-active' : 'bg-app-muted/60'}`} />
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="mb-5">
        <SectionHeader
          title={t('Events')}
          icon={<CalendarDays className="h-6 w-6 text-app-purple" />}
          action={t('Add event')}
          onAction={() => { setStartDate(selectedDate); setScope(scopeFilter); setAssignees([]); setIsAdding(true); }}
        />
        {selectedEvents.map((event) => (
          <EventItem key={event.id} event={event} onDelete={deleteEvent} />
        ))}
        {selectedEvents.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('No events that day')} body={t('Tap Add event to put something on this date.')} />
        ) : null}
      </GlassCard>

      <EntrySheet
        isOpen={isAdding}
        title={t('New event')}
        description={t('Plan it now without going through Detect Cards.')}
        icon={CalendarDays}
        toneClass="text-app-purple"
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAdd} className="entry-sheet-form">
          <ScopePicker value={scope} onChange={setScope} allowAssignee assigneeIds={assignees.map((member) => member.id)} onAssigneesChange={setAssignees} />
          <FormField label={t('Event')}>
            <input className="form-control" placeholder={t("What's happening?")} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label={t('Date')}>
              <input className="form-control" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            </FormField>
            <FormField label={t('Time')}>
              <input className="form-control" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </FormField>
          </div>
          <FormField label={t('Repeat?')}>
            <select className="form-control" value={repeat} onChange={(event) => setRepeat(event.target.value as RepeatRule)}>
              {(['none', 'daily', 'weekly', 'biweekly', 'monthly'] as RepeatRule[]).map((value) => <option key={value} value={value}>{t(`Repeat ${value}`)}</option>)}
            </select>
          </FormField>
          <FormField label={t('Location')}>
            <input className="form-control" placeholder={t('Optional')} value={location} onChange={(event) => setLocation(event.target.value)} />
          </FormField>
          <FormField label={t('Category')}>
            <CategoryPicker value={category} onChange={setCategory} />
          </FormField>
          <div className="entry-sheet-actions">
            <button type="button" className="secondary-button" onClick={() => setIsAdding(false)}>{t('Cancel')}</button>
            <button className="primary-button" type="submit">
              <Plus className="h-4 w-4" />
              {t('Add event')}
            </button>
          </div>
        </form>
      </EntrySheet>
    </>
  );
}
