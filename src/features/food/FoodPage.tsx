import { Check, ForkKnife, Minus, PackageCheck, Plus, Vote } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useVardagData } from '../../app/VardagDataContext';
import { useI18n } from '../../app/I18nContext';
import { EmptyState } from '../../components/EmptyState';
import { EntrySheet } from '../../components/EntrySheet';
import { FoodLogItem } from '../../components/FoodLogItem';
import { FoodDecisionCard } from '../../components/FoodDecisionCard';
import { FormField } from '../../components/FormField';
import { GlassCard } from '../../components/GlassCard';
import { PageHeader } from '../../components/PageHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { FamilyMemberPicker, ScopePicker } from '../../components/ScopePicker';
import { SlidingControl } from '../../components/SlidingControl';
import { Text } from '../../components/Typography';
import { todayISO, uid } from '../../lib/utils';
import type { FoodDecisionMode, MealType, SharingScope } from '../../types/models';
import { useAuth } from '../../app/AuthContext';
import { isRecordVisibleToUser } from '../../lib/recordVisibility';

export function FoodPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    foodLogs,
    foodDecisions,
    addFoodLog,
    adjustFoodPortions,
    removeFoodFromToday,
    addFoodDecision,
    voteFoodOption,
    addFoodVoteOption,
    decideFoodPoll,
    deleteFoodDecision,
    currentVoterId
  } = useVardagData();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [eatenAt, setEatenAt] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [portionsLeft, setPortionsLeft] = useState('');
  const [scope, setScope] = useState<SharingScope>('family');
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [scopeFilter, setScopeFilter] = useState<SharingScope>('family');
  const [isPlanning, setIsPlanning] = useState(false);
  const [decisionMode, setDecisionMode] = useState<FoodDecisionMode>('fixed');
  const [decisionMeal, setDecisionMeal] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionDate, setDecisionDate] = useState(todayISO());
  const [decisionMealType, setDecisionMealType] = useState<MealType>('dinner');
  const [pollOptions, setPollOptions] = useState(['', '', '']);
  const [pollVoters, setPollVoters] = useState<Array<{ id: string; name: string }>>([]);

  const today = todayISO();
  const scopedFoodLogs = useMemo(() => foodLogs.filter((food) => (food.scope ?? 'family') === scopeFilter && isRecordVisibleToUser(food, user?.id)), [foodLogs, scopeFilter, user?.id]);
  const scopedDecisions = useMemo(() => foodDecisions.filter((decision) => (decision.scope ?? 'family') === scopeFilter && isRecordVisibleToUser(decision, user?.id)), [foodDecisions, scopeFilter, user?.id]);
  const todayMeals = scopedFoodLogs.filter((food) => food.eatenAt === today && !food.hiddenFromToday);
  const currentPlannedMeal = scopedFoodLogs
    .filter((food) => food.eatenAt === today && food.sourceDecisionId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const leftovers = scopedFoodLogs.filter((food) => (food.portionsLeft ?? 0) > 0 || food.id === currentPlannedMeal?.id);
  const openPolls = scopedDecisions.filter((decision) => decision.mode === 'poll' && decision.status === 'open');
  const mealLabel = (value: MealType) => t(value.slice(0, 1).toUpperCase() + value.slice(1));
  const voterNames = pollVoters.map((voter) => voter.name);
  const voterTitle = voterNames.length
    ? t('{names} get to choose the meal', {
        names: voterNames.length === 1
          ? voterNames[0]
          : `${voterNames.slice(0, -1).join(', ')} ${t('and')} ${voterNames[voterNames.length - 1]}`
      })
    : '';

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;

    await addFoodLog({
      title: title.trim(),
      mealType,
      eatenAt,
      notes: notes.trim() || undefined,
      portionsLeft: portionsLeft ? Number(portionsLeft) : undefined,
      scope,
      assigneeId: assignees[0]?.id,
      assigneeName: assignees[0]?.name,
      assigneeIds: assignees.map((member) => member.id),
      assigneeNames: assignees.map((member) => member.name)
    });
    setTitle('');
    setMealType('lunch');
    setEatenAt(todayISO());
    setNotes('');
    setPortionsLeft('');
    setScope('family');
    setAssignees([]);
    setIsAdding(false);
  };

  const handleDecision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (decisionMode === 'fixed' && !decisionMeal.trim()) return;
    if (decisionMode === 'poll' && options.length < 2) return;

    await addFoodDecision({
      title: decisionMode === 'fixed'
        ? t('{meal} is decided', { meal: mealLabel(decisionMealType) })
        : decisionTitle.trim() || voterTitle || t('What should we have for {meal}?', { meal: mealLabel(decisionMealType).toLowerCase() }),
      mealDate: decisionDate,
      mealType: decisionMealType,
      mode: decisionMode,
      status: decisionMode === 'fixed' ? 'decided' : 'open',
      decidedMeal: decisionMode === 'fixed' ? decisionMeal.trim() : undefined,
      eligibleVoterIds: decisionMode === 'poll' ? pollVoters.map((voter) => voter.id) : undefined,
      eligibleVoterNames: decisionMode === 'poll' ? voterNames : undefined,
      options: decisionMode === 'poll'
        ? options.map((title) => ({ id: uid('option'), title, voterIds: [] }))
        : [],
      scope: scopeFilter
    });
    setDecisionMeal('');
    setDecisionTitle('');
    setDecisionDate(todayISO());
    setDecisionMealType('dinner');
    setPollOptions(['', '', '']);
    setPollVoters([]);
    setDecisionMode('fixed');
    setIsPlanning(false);
  };

  return (
    <>
      <PageHeader title={t('Food')} />
      <ScopePicker value={scopeFilter} onChange={setScopeFilter} className="mb-4" showLabel={false} />

      <section className="mb-4">
        <SectionHeader title={t('Meal plans')} />
        <div className="meal-plan-actions">
          <button type="button" onClick={() => { setDecisionMode('fixed'); setPollVoters([]); setIsPlanning(true); }}>
            <Check className="h-5 w-5 text-app-green" />
            <span>{t('Decide meal')}</span>
          </button>
          <button type="button" onClick={() => { setDecisionMode('poll'); setPollVoters([]); setIsPlanning(true); }}>
            <Vote className="h-5 w-5 text-app-purple" />
            <span>{t('Start vote')}</span>
          </button>
        </div>
        <div className="grid gap-3">
          {openPolls.map((decision) => (
            <FoodDecisionCard
              key={decision.id}
              decision={decision}
              currentVoterId={currentVoterId}
              onVote={voteFoodOption}
              onAddOption={addFoodVoteOption}
              onDecide={decideFoodPoll}
              onDelete={deleteFoodDecision}
            />
          ))}
        </div>
      </section>

      <GlassCard className="mb-4" variant="flat">
        <SectionHeader
          title={t(todayMeals.length === 1 ? "Today's Meal" : "Today's Meals")}
          icon={<ForkKnife className="h-6 w-6 text-app-green" />}
        />
        {todayMeals.map((food) => (
          <div key={food.id} className="food-meal-block">
            <FoodLogItem food={food} onDelete={removeFoodFromToday} showPortions={false} compact />
          </div>
        ))}
        {todayMeals.length === 0 ? (
          <EmptyState icon={ForkKnife} title={t('No meals today')} body={t('Add a meal or parse one from Today.')} />
        ) : null}
      </GlassCard>

      <GlassCard variant="quiet">
        <SectionHeader title={t('Leftovers')} icon={<PackageCheck className="h-6 w-6 text-app-purple" />} />
        {leftovers.map((food) => (
          <LeftoverRow key={food.id} food={food} onAdjust={adjustFoodPortions} />
        ))}
        {leftovers.length === 0 ? (
          <EmptyState icon={PackageCheck} title={t('No leftovers')} body={t('Add portions when logging a meal.')} />
        ) : null}
      </GlassCard>

      <EntrySheet
        isOpen={isAdding}
        title={t('Log food')}
        description={t('Record a meal now, including anything left over.')}
        icon={ForkKnife}
        toneClass="text-app-green"
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAdd} className="entry-sheet-form">
          <ScopePicker value={scope} onChange={setScope} allowAssignee assigneeIds={assignees.map((member) => member.id)} onAssigneesChange={setAssignees} />
          <FormField label={t('Meal')}>
            <input className="form-control" placeholder={t('What did you eat?')} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label={t('Meal type')}>
              <select className="form-control" value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>
                {(['breakfast', 'lunch', 'dinner', 'snack', 'other'] as MealType[]).map((value) => <option key={value} value={value}>{mealLabel(value)}</option>)}
              </select>
            </FormField>
            <FormField label={t('Date')}>
              <input className="form-control" type="date" value={eatenAt} onChange={(event) => setEatenAt(event.target.value)} required />
            </FormField>
          </div>
          <FormField label={t('Notes')} hint={t('Calories, storage details or anything useful later')}>
            <input className="form-control" placeholder={t('Optional')} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </FormField>
          <FormField label={t('Portions left')}>
            <input className="form-control" type="number" min="0" inputMode="numeric" placeholder="0" value={portionsLeft} onChange={(event) => setPortionsLeft(event.target.value)} />
          </FormField>
          <div className="entry-sheet-actions">
            <button type="button" className="secondary-button" onClick={() => setIsAdding(false)}>{t('Cancel')}</button>
            <button className="primary-button primary-button--green" type="submit">
              <Plus className="h-4 w-4" />
              {t('Add meal')}
            </button>
          </div>
        </form>
      </EntrySheet>

      <EntrySheet
        isOpen={isPlanning}
        title={t('Plan a family meal')}
        description={t('Choose directly or let everyone vote.')}
        icon={decisionMode === 'fixed' ? Check : Vote}
        toneClass={decisionMode === 'fixed' ? 'text-app-green' : 'text-app-purple'}
        onClose={() => setIsPlanning(false)}
      >
        <form onSubmit={handleDecision} className="entry-sheet-form">
          <SlidingControl
            value={decisionMode}
            options={[
              { value: 'fixed', label: t('Decide meal'), activeClassName: 'text-app-green' },
              { value: 'poll', label: t('Start vote'), activeClassName: 'text-app-purple' }
            ]}
            onChange={setDecisionMode}
            ariaLabel={t('Meal planning mode')}
          />

          <div className="grid grid-cols-2 gap-2">
            <FormField label={t('Date')}>
              <input className="form-control" type="date" value={decisionDate} onChange={(event) => setDecisionDate(event.target.value)} required />
            </FormField>
            <FormField label={t('Meal')}>
              <select className="form-control" value={decisionMealType} onChange={(event) => setDecisionMealType(event.target.value as MealType)}>
                {(['breakfast', 'lunch', 'dinner', 'snack', 'other'] as MealType[]).map((value) => <option key={value} value={value}>{mealLabel(value)}</option>)}
              </select>
            </FormField>
          </div>

          {decisionMode === 'fixed' ? (
            <FormField label={t("We're having")} hint={t('This publishes the meal as decided.')}>
              <input className="form-control" placeholder={t('Example: pancakes')} value={decisionMeal} onChange={(event) => setDecisionMeal(event.target.value)} autoFocus required />
            </FormField>
          ) : (
            <>
              {scopeFilter === 'family' ? (
                <FamilyMemberPicker
                  selectedIds={pollVoters.map((voter) => voter.id)}
                  onChange={setPollVoters}
                />
              ) : null}
              <FormField label={t('Question')} hint={t('Leave blank to use the default question.')}>
                <input className="form-control" placeholder={voterTitle || t('What should we have for {meal}?', { meal: mealLabel(decisionMealType).toLowerCase() })} value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} />
              </FormField>
              <div className="grid gap-2">
                {pollOptions.map((option, index) => (
                  <FormField key={index} label={`${t('Option')} ${index + 1}${index === 2 ? ` (${t('optional')})` : ''}`}>
                    <input
                      className="form-control"
                      placeholder={t('Dish')}
                      value={option}
                      onChange={(event) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                      required={index < 2}
                    />
                  </FormField>
                ))}
              </div>
            </>
          )}

          <div className="entry-sheet-actions">
            <button type="button" className="secondary-button" onClick={() => setIsPlanning(false)}>{t('Cancel')}</button>
            <button className={`primary-button ${decisionMode === 'fixed' ? 'primary-button--green' : ''}`} type="submit">
              {decisionMode === 'fixed' ? <Check className="h-4 w-4" /> : <Vote className="h-4 w-4" />}
              {t(decisionMode === 'fixed' ? 'Set meal' : 'Start vote')}
            </button>
          </div>
        </form>
      </EntrySheet>
    </>
  );
}

function LeftoverRow({
  food,
  onAdjust
}: {
  food: { id: string; title: string; portionsLeft?: number };
  onAdjust: (id: string, delta: number) => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <div className="leftover-row">
      <div className="leftover-row__icon">
        <PackageCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <Text className="truncate text-sm font-semibold text-app-fg">{food.title}</Text>
        <Text className="mt-0.5 text-xs text-app-purple">{food.portionsLeft ?? 0} {t((food.portionsLeft ?? 0) === 1 ? 'portion left' : 'portions left')}</Text>
      </div>
      <div className="leftover-stepper__controls">
        <button type="button" aria-label={t('Remove one portion')} disabled={!food.portionsLeft} onClick={() => void onAdjust(food.id, -1)}><Minus className="h-4 w-4" /></button>
        <Text as="span" className="w-6 text-center font-semibold text-app-fg">{food.portionsLeft ?? 0}</Text>
        <button type="button" aria-label={t('Add one portion')} onClick={() => void onAdjust(food.id, 1)}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
