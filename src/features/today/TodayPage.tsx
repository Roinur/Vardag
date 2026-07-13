import {
  CalendarDays,
  CheckSquare,
  ForkKnife,
  Send,
  Sparkles,
  ShoppingCart,
  type LucideIcon
} from 'lucide-react';
import { FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useVardagData } from '../../app/VardagDataContext';
import { useAuth } from '../../app/AuthContext';
import { useI18n } from '../../app/I18nContext';
import { PriorityDot } from '../../components/PriorityDot';
import { SectionHeader } from '../../components/SectionHeader';
import { ScopePicker } from '../../components/ScopePicker';
import { SuggestionCard } from '../../components/SuggestionCard';
import { Heading, Text } from '../../components/Typography';
import { formatShortDate, todayISO } from '../../lib/utils';
import { detectIntentHint, explicitIntentLabel } from '../../lib/intentDetection';
import { haptic } from '../../lib/motion';
import { occursOnDate } from '../../lib/recurrence';
import { isRecordVisibleToUser } from '../../lib/recordVisibility';
import type { SharingScope, ShoppingItem, Suggestion, SuggestionType, Task } from '../../types/models';

const overviewPages = ['Summary', 'Focus'] as const;
const intentMeta = {
  task: { label: 'Task', icon: CheckSquare, tone: 'text-app-blue' },
  event: { label: 'Event', icon: CalendarDays, tone: 'text-app-purple' },
  shopping: { label: 'Shopping', icon: ShoppingCart, tone: 'text-app-green' },
  food: { label: 'Food', icon: ForkKnife, tone: 'text-app-orange' }
} as const;
interface ComposerSentence {
  id: number;
  text: string;
  intent?: SuggestionType;
  trigger?: string;
}

export function TodayPage() {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const {
    tasks,
    events,
    shoppingItems,
    submitEntry,
    acceptSuggestion,
    toggleTask,
    toggleEvent,
    toggleShoppingItem
  } = useVardagData();
  const sentenceIdRef = useRef(1);
  const [composerSentences, setComposerSentences] = useState<ComposerSentence[]>([{ id: 0, text: '' }]);
  const [entryId, setEntryId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [parserMessage, setParserMessage] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [familySendingId, setFamilySendingId] = useState<string>();
  const [scopeFilter, setScopeFilter] = useState<SharingScope>('family');
  const [activeOverview, setActiveOverview] = useState(0);
  const overviewTrackRef = useRef<HTMLDivElement | null>(null);

  const today = todayISO();
  const scopedTasks = tasks.filter((task) => (task.scope ?? 'family') === scopeFilter && isRecordVisibleToUser(task, user?.id));
  const scopedEvents = events.filter((event) => (event.scope ?? 'family') === scopeFilter && isRecordVisibleToUser(event, user?.id));
  const scopedShoppingItems = shoppingItems.filter((item) => (item.scope ?? 'family') === scopeFilter && isRecordVisibleToUser(item, user?.id));
  const todayTasks = scopedTasks.filter((task) => task.dueDate === today && task.status === 'todo');
  const todayEvents = scopedEvents.filter((event) => !event.isCompleted && occursOnDate(event.startDate, event.repeat, today));
  const toBuyItems = scopedShoppingItems.filter((item) => !item.isBought);
  const focusTask = todayTasks[0];
  const upcomingEvent = scopedEvents.find((event) => !event.isCompleted && (occursOnDate(event.startDate, event.repeat, today) || event.startDate >= today));
  const firstShoppingItem = toBuyItems[0];
  const hasOnDeckItems = Boolean(focusTask || upcomingEvent || firstShoppingItem);

  const headerDate = useMemo(() => {
    const date = new Date(`${today}T00:00:00`);
    return {
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace('.', ''),
      date: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date).replace('.', '')
    };
  }, [locale, today]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rawText = composerSentences
      .map((sentence) => {
        const trimmed = sentence.text.trim();
        if (!trimmed) return '';
        return sentence.intent ? `${explicitIntentLabel[sentence.intent]}: ${trimmed}` : trimmed;
      })
      .filter(Boolean)
      .join('. ');
    if (!rawText) return;

    setIsParsing(true);
    setParserMessage('');
    try {
      const parsed = await submitEntry(rawText, scopeFilter);
      setEntryId(parsed.entryId);
      setSuggestions(parsed.suggestions);
      setParserMessage(parsed.suggestions.length === 0 ? t('Could not find anything useful in that text.') : '');
      setComposerSentences([{ id: sentenceIdRef.current++, text: '' }]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAccept = async (suggestion: Suggestion) => {
    await acceptSuggestion(suggestion, entryId);
    if ((suggestion.scope ?? scopeFilter) === 'family') {
      setFamilySendingId(suggestion.id);
      haptic('family');
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    } else haptic('success');
    setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    setFamilySendingId(undefined);
  };

  const jumpToOverview = (index: number) => {
    setActiveOverview(index);
    const track = overviewTrackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  };

  return (
    <>
      <header className="today-header">
        <Heading level={1} className="text-[2.25rem] leading-none">
          {t('Today')}
        </Heading>
        <div className="today-header-date" aria-label={`${headerDate.weekday} ${headerDate.date}`}>
          <Text className="text-[0.65rem] font-semibold uppercase text-app-active">{headerDate.weekday}</Text>
          <Text className="text-lg font-semibold leading-none text-app-fg">{headerDate.date}</Text>
        </div>
      </header>

      <ScopePicker
        value={scopeFilter}
        onChange={(scope) => {
          setScopeFilter(scope);
          setSuggestions((current) => current.map((suggestion) => ({
            ...suggestion,
            scope,
            ...(scope === 'personal' ? { assigneeId: undefined, assigneeName: undefined, assigneeIds: [], assigneeNames: [] } : {})
          })));
        }}
        className="mb-4"
        showLabel={false}
      />

      <section className="today-overview-widget mb-4" aria-label={t('Today overview')}>
        <div className="today-overview-shell">
          <div
            ref={overviewTrackRef}
            className="today-overview-track scrollbar-none"
            onScroll={(event) => {
              const width = event.currentTarget.clientWidth || 1;
              setActiveOverview(Math.round(event.currentTarget.scrollLeft / width));
            }}
          >
            <div className="today-overview-page today-overview-page--summary">
              <div className="today-overview-metrics" aria-label={t('Today counts')}>
                <MiniCount icon={CheckSquare} label={t(todayTasks.length === 1 ? 'Task' : 'Tasks')} value={todayTasks.length} tone="blue" />
                <MiniCount icon={CalendarDays} label={t(todayEvents.length === 1 ? 'Event' : 'Events')} value={todayEvents.length} tone="purple" />
                <MiniCount icon={ShoppingCart} label={t(toBuyItems.length === 1 ? 'Item to buy' : 'To buy')} value={toBuyItems.length} tone="green" />
              </div>
            </div>

            <div className="today-overview-page">
              <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-app-purple">{t('Focus')}</Text>
              {focusTask ? (
                <div className="today-focus-line">
                  <RowIcon icon={CheckSquare} tone="blue" />
                  <div className="min-w-0 flex-1 text-left">
                    <Text className="truncate text-lg font-semibold text-app-fg">{focusTask.title}</Text>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {focusTask.category ? <Text className="text-sm">{t(focusTask.category)}</Text> : null}
                      {focusTask.dueDate ? <Text className="text-sm">{formatShortDate(focusTask.dueDate, locale)}</Text> : null}
                      <PriorityDot priority={focusTask.priority} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="today-focus-empty">
                  <Heading level={2} className="text-2xl leading-tight">
                    {t('Nothing urgent right now')}
                  </Heading>
                  <Text className="mt-1 text-sm">{t('Use the box below if something pops up.')}</Text>
                </div>
              )}
            </div>
          </div>

          <div className="today-overview-dots" aria-label={t('Overview pages')}>
            {overviewPages.map((label, index) => (
              <button
                key={label}
                type="button"
                aria-label={`${t('Show')} ${t(label)}`}
                className={index === activeOverview ? 'is-active' : ''}
                onClick={() => jumpToOverview(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="today-compose mb-4">
        <SmartIntentComposer sentences={composerSentences} onChange={setComposerSentences} nextId={() => sentenceIdRef.current++} />
        <button
          type="submit"
          disabled={!composerSentences.some((sentence) => sentence.text.trim()) || isParsing}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-app-active px-4 py-3 font-semibold text-[#061528] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          {t(isParsing ? 'Checking...' : 'Detect cards')}
        </button>
        {parserMessage ? (
          <Text className="text-sm" role="status">
            {parserMessage}
          </Text>
        ) : null}
      </form>

      {suggestions.length > 0 ? (
        <section className="mb-5">
          <SectionHeader title={t('Detected Cards')} action={t(suggestions.length === 1 ? '{count} card found' : '{count} cards found', { count: suggestions.length })} />
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              confirmingFamily={familySendingId === suggestion.id}
              onAccept={handleAccept}
              onIgnore={(id) => setSuggestions((current) => current.filter((item) => item.id !== id))}
            />
          ))}
        </section>
      ) : null}

      {hasOnDeckItems ? (
      <section className="today-brief">
        <div className="today-brief-list">
          {focusTask ? (
            <SwipeComplete onComplete={() => toggleTask(focusTask)}>
              <TaskOverviewRow task={focusTask} />
            </SwipeComplete>
          ) : null}

          {upcomingEvent ? (
            <SwipeComplete onComplete={() => toggleEvent(upcomingEvent)}>
              <OverviewRow
                icon={CalendarDays}
                tone="purple"
                title={upcomingEvent.title}
                meta={[formatShortDate(upcomingEvent.startDate, locale), upcomingEvent.startTime, upcomingEvent.location].filter(Boolean).join(' - ') || t('Upcoming event')}
              />
            </SwipeComplete>
          ) : null}

          {firstShoppingItem ? (
            <SwipeComplete onComplete={() => toggleShoppingItem(firstShoppingItem)}>
              <ShoppingOverviewRow item={firstShoppingItem} count={toBuyItems.length} />
            </SwipeComplete>
          ) : null}
        </div>
      </section>
      ) : null}
    </>
  );
}

function SwipeComplete({ children, onComplete }: { children: ReactNode; onComplete: () => void | Promise<void> }) {
  const { t } = useI18n();
  const startX = useRef(0);
  const thresholdReached = useRef(false);
  const [offset, setOffset] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
    thresholdReached.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const nextOffset = Math.max(-120, Math.min(120, event.clientX - startX.current));
    const nextReached = Math.abs(nextOffset) > 72;
    if (nextReached !== thresholdReached.current) {
      thresholdReached.current = nextReached;
      haptic('light');
    }
    setOffset(nextOffset);
  };
  const finish = () => {
    if (Math.abs(offset) > 72) {
      setLeaving(true);
      setTimeout(() => void onComplete(), 170);
    } else {
      thresholdReached.current = false;
      setOffset(0);
    }
  };
  const direction = offset < 0 ? -1 : 1;
  return <div className={`swipe-complete ${Math.abs(offset) > 1 || leaving ? 'is-dragging' : ''} ${leaving ? 'is-leaving' : ''}`}>
    <div className={`swipe-complete__action ${direction < 0 ? 'is-right' : 'is-left'}`}><CheckSquare className="h-4 w-4" /><span>{t('Complete')}</span></div>
    <div className="swipe-complete__content" style={{ transform: `translateX(${leaving ? direction * 120 : offset}px)` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={() => setOffset(0)} onClickCapture={(event) => {
      if (Math.abs(offset) < 10) return;
      event.preventDefault(); event.stopPropagation();
    }}>
      {children}
    </div>
  </div>;
}

function SmartIntentComposer({
  sentences,
  onChange,
  nextId
}: {
  sentences: ComposerSentence[];
  onChange: (sentences: ComposerSentence[]) => void;
  nextId: () => number;
}) {
  const { t } = useI18n();
  const inputsRef = useRef(new Map<number, HTMLTextAreaElement>());
  const pendingFocusId = useRef<number>();
  const hintedIndex = sentences.findIndex((sentence) => {
    if (sentence.intent) return false;
    const candidate = detectIntentHint(sentence.text);
    return Boolean(candidate && !sentence.text.slice(candidate.end).trim());
  });
  const hint = hintedIndex >= 0 ? detectIntentHint(sentences[hintedIndex].text) : undefined;

  useEffect(() => {
    inputsRef.current.forEach((input) => {
      input.style.height = 'auto';
      input.style.height = `${Math.max(24, input.scrollHeight)}px`;
    });
    if (pendingFocusId.current === undefined) return;
    const input = inputsRef.current.get(pendingFocusId.current);
    input?.focus();
    if (input) input.setSelectionRange(input.value.length, input.value.length);
    pendingFocusId.current = undefined;
  }, [sentences]);

  const updateSentence = (index: number, value: string) => {
    if (!/[.!?\n]/u.test(value)) {
      onChange(sentences.map((sentence, itemIndex) => itemIndex === index ? { ...sentence, text: value } : sentence));
      return;
    }

    const parts = value.split(/[.!?\n]+/u);
    const first = { ...sentences[index], text: parts.shift() ?? '' };
    const inserted = parts.map((text) => ({ id: nextId(), text: text.trimStart() }));
    const next = [...sentences.slice(0, index), first, ...inserted, ...sentences.slice(index + 1)];
    pendingFocusId.current = inserted[inserted.length - 1]?.id;
    onChange(next);
  };

  return (
    <div className="intent-composer" aria-label={t('Write what is happening or what you need to remember...')}>
      {sentences.map((sentence, index) => {
        const sentenceHint = index === hintedIndex ? hint : undefined;
        const confirmed = sentence.intent ? intentMeta[sentence.intent] : undefined;
        const ConfirmedIcon = confirmed?.icon;
        return (
          <div key={sentence.id} className={`intent-sentence ${sentences.length === 1 ? 'is-only' : ''}`}>
            {sentenceHint ? (
              <div className="intent-thought" role="status">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-app-muted" />
                <Text as="span" className="intent-thought__trigger">{sentenceHint.trigger}</Text>
                <div className="intent-thought__choices">
                  {sentenceHint.candidates.map((type) => {
                    const meta = intentMeta[type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`intent-choice ${meta.tone}`}
                        aria-label={`${t('Use as')} ${t(meta.label)}`}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => {
                          pendingFocusId.current = sentence.id;
                          onChange(sentences.map((item, itemIndex) => itemIndex === index ? { ...item, intent: type, trigger: sentenceHint.trigger } : item));
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{t(meta.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {confirmed && ConfirmedIcon ? (
              <button
                type="button"
                className={`confirmed-intent ${confirmed.tone}`}
                aria-label={t('Change card type')}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  pendingFocusId.current = sentence.id;
                  onChange(sentences.map((item, itemIndex) => itemIndex === index ? { ...item, intent: undefined, trigger: undefined } : item));
                }}
              >
                <ConfirmedIcon className="h-3 w-3" />
                <span>{t(confirmed.label)}</span>
              </button>
            ) : null}
            <textarea
              ref={(element) => {
                if (element) inputsRef.current.set(sentence.id, element);
                else inputsRef.current.delete(sentence.id);
              }}
              rows={1}
              className="intent-sentence__input"
              placeholder={sentences.length === 1 && index === 0 ? t('Write what is happening or what you need to remember...') : undefined}
              value={sentence.text}
              onChange={(event) => updateSentence(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Backspace') return;
                if (sentence.intent && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0) {
                  event.preventDefault();
                  pendingFocusId.current = sentence.id;
                  onChange(sentences.map((item, itemIndex) => itemIndex === index ? {
                    ...item,
                    intent: undefined,
                    trigger: undefined
                  } : item));
                  return;
                }
                if (sentence.text || index === 0) return;
                event.preventDefault();
                const previous = sentences[index - 1];
                pendingFocusId.current = previous.id;
                onChange(sentences.filter((_, itemIndex) => itemIndex !== index));
              }}
            />
            {index < sentences.length - 1 ? <span className="intent-sentence__period" aria-hidden="true">.</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function MiniCount({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: 'blue' | 'purple' | 'green';
}) {
  const toneClass = {
    blue: 'text-app-blue',
    purple: 'text-app-purple',
    green: 'text-app-green'
  }[tone];

  return (
    <div className="today-mini-count">
      <Icon className={`today-mini-count-icon ${toneClass}`} />
      <Text className="today-mini-count-value">{value}</Text>
      <Text className="today-mini-count-label">{label}</Text>
    </div>
  );
}

function TaskOverviewRow({ task }: { task: Task }) {
  const { locale, t } = useI18n();
  return (
    <div className="today-brief-row">
      <RowIcon icon={CheckSquare} tone="blue" />
      <div className="min-w-0 flex-1 text-left">
        <Text className="truncate font-semibold text-app-fg">{task.title}</Text>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {task.category ? <Text className="text-sm">{t(task.category)}</Text> : null}
          {task.dueDate ? <Text className="text-sm">{formatShortDate(task.dueDate, locale)}</Text> : null}
          <PriorityDot priority={task.priority} />
        </div>
      </div>
    </div>
  );
}

function ShoppingOverviewRow({
  item,
  count
}: {
  item: ShoppingItem;
  count: number;
}) {
  const { t } = useI18n();
  return (
    <div className="today-brief-row">
      <RowIcon icon={ShoppingCart} tone="green" />
      <div className="min-w-0 flex-1 text-left">
        <Text className="truncate font-semibold text-app-fg">{item.name}</Text>
        <Text className="mt-1 text-sm">{count > 2 ? t('{count} more items', { count: count - 1 }) : count === 2 ? t('One more item') : t('Shopping reminder')}</Text>
      </div>
    </div>
  );
}

function OverviewRow({
  icon,
  tone,
  title,
  meta
}: {
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'purple';
  title: string;
  meta: string;
}) {
  return (
    <div className="today-brief-row">
      <RowIcon icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <Text className="truncate font-semibold text-app-fg">{title}</Text>
        <Text className="mt-1 text-sm">{meta}</Text>
      </div>
    </div>
  );
}

function RowIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: 'blue' | 'green' | 'purple' }) {
  const toneClass = {
    blue: 'text-app-blue border-app-blue/20 bg-app-blue/10',
    green: 'text-app-green border-app-green/20 bg-app-green/10',
    purple: 'text-app-purple border-app-purple/20 bg-app-purple/10'
  }[tone];

  return (
    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${toneClass}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}
