import { Check, Plus, Trash2, Trophy, Vote, X } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FoodDecision } from '../types/models';
import { useI18n } from '../app/I18nContext';
import { formatShortDate } from '../lib/utils';
import { GlassCard } from './GlassCard';
import { Heading, Text } from './Typography';
import { useAuth } from '../app/AuthContext';

interface FoodDecisionCardProps {
  decision: FoodDecision;
  currentVoterId: string;
  onVote: (decisionId: string, optionId: string) => void;
  onAddOption: (decisionId: string, title: string) => void;
  onDecide: (decisionId: string, optionId?: string) => void;
  onDelete: (id: string) => void;
}

export function FoodDecisionCard({
  decision,
  currentVoterId,
  onVote,
  onAddOption,
  onDecide,
  onDelete
}: FoodDecisionCardProps) {
  const { locale, t } = useI18n();
  const { user, householdMembers } = useAuth();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [rouletteOptionId, setRouletteOptionId] = useState<string>();
  const [isChoosing, setIsChoosing] = useState(false);
  const [isOwnerInfoOpen, setIsOwnerInfoOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const totalVotes = useMemo(() => decision.options.reduce((sum, option) => sum + option.voterIds.length, 0), [decision.options]);
  const canVote = !decision.eligibleVoterIds?.length || decision.eligibleVoterIds.includes(currentVoterId);
  const owner = householdMembers.find((member) => member.id === decision.ownerId);
  const ownerName = owner?.displayName ?? t('Family member');
  const canDecide = !decision.ownerId || decision.ownerId === user?.id;
  const eligibleNames = decision.eligibleVoterIds?.length
    ? decision.eligibleVoterIds.map((id, index) => householdMembers.find((member) => member.id === id)?.displayName ?? decision.eligibleVoterNames?.[index] ?? t('Family member'))
    : [];

  const chooseWinner = () => {
    const topVotes = Math.max(...decision.options.map((option) => option.voterIds.length));
    const tied = decision.options.filter((option) => option.voterIds.length === topVotes);
    if (tied.length < 2) return onDecide(decision.id, tied[0]?.id);

    setIsChoosing(true);
    timers.current.forEach(window.clearTimeout);
    const winner = tied[Math.floor(Math.random() * tied.length)];
    const steps = 14 + Math.floor(Math.random() * 5);
    let elapsed = 0;
    let index = 0;
    let direction = 1;
    timers.current = Array.from({ length: steps }, (_, step) => {
      elapsed += 55 + Math.pow(step / steps, 2.4) * 330;
      if (index === tied.length - 1) direction = -1;
      if (index === 0) direction = 1;
      index += direction;
      const optionId = step === steps - 1 ? winner.id : tied[index].id;
      return window.setTimeout(() => {
        setRouletteOptionId(optionId);
        if (step === steps - 1) window.setTimeout(() => onDecide(decision.id, optionId), 420);
      }, elapsed);
    });
  };

  const submitSuggestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!suggestion.trim()) return;
    onAddOption(decision.id, suggestion.trim());
    setSuggestion('');
    setIsSuggesting(false);
  };

  if (decision.status === 'decided' || decision.mode === 'fixed') {
    return (
      <GlassCard className="motion-card" variant="flat">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-app-green/25 bg-app-green/10 text-app-green">
            <Check className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <Text className="text-xs font-semibold uppercase text-app-green">{t('{meal} decided', { meal: t(decision.mealType.slice(0, 1).toUpperCase() + decision.mealType.slice(1)) })}</Text>
            <Heading level={3} className="mt-1 text-lg">{decision.decidedMeal ?? decision.title}</Heading>
            <Text className="mt-1 text-sm">{formatShortDate(decision.mealDate, locale)}</Text>
          </div>
          <button type="button" className="icon-button" aria-label={t('Delete meal decision')} onClick={() => onDelete(decision.id)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="motion-card">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-app-purple/25 bg-app-purple/10 text-app-purple">
          <Vote className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Text className="text-xs font-semibold uppercase text-app-purple">{t('{meal} vote', { meal: t(decision.mealType.slice(0, 1).toUpperCase() + decision.mealType.slice(1)) })}</Text>
            <button type="button" className="scope-identity-button h-6 w-6 flex-[0_0_1.5rem]" aria-label={t('Vote details')} onClick={() => setIsOwnerInfoOpen(true)}>
              {owner?.avatarUrl ? <img src={owner.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="text-[0.65rem] font-semibold text-app-purple">{ownerName.slice(0, 1).toUpperCase()}</span>}
            </button>
          </div>
          <Heading level={3} className="mt-1 text-lg">{decision.title}</Heading>
          <Text className="mt-1 text-sm">{formatShortDate(decision.mealDate, locale)} · {totalVotes} {t(totalVotes === 1 ? 'vote' : 'votes')}</Text>
        </div>
        <button type="button" className="icon-button" aria-label={t('Delete vote')} onClick={() => onDelete(decision.id)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {decision.options.map((option) => {
          const selected = option.voterIds.includes(currentVoterId);
          const share = totalVotes ? Math.round((option.voterIds.length / totalVotes) * 100) : 0;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              className={`food-vote-option ${selected ? 'is-selected' : ''} ${rouletteOptionId === option.id ? 'is-roulette' : ''}`}
              disabled={!canVote}
              onClick={() => onVote(decision.id, option.id)}
            >
              <span className="min-w-0 flex-1">
                <Text as="span" className="block truncate font-semibold text-app-fg">{option.title}</Text>
                {option.suggestedBy ? <Text as="span" className="mt-0.5 block truncate text-xs">{t('Suggested by {name}', { name: option.suggestedBy })}</Text> : null}
              </span>
              <Text as="span" className="shrink-0 text-sm">{option.voterIds.length}</Text>
              <span className="food-vote-bar" aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
            </button>
          );
        })}
      </div>

      {!canVote ? <Text className="mt-3 text-sm text-app-purple">{t('Only selected family members can vote.')}</Text> : null}

      {canVote && isSuggesting ? (
        <form onSubmit={submitSuggestion} className="mt-3 flex gap-2">
          <input className="form-control" placeholder={t('Your suggestion')} value={suggestion} onChange={(event) => setSuggestion(event.target.value)} autoFocus />
          <button className="primary-button shrink-0 px-4" type="submit" aria-label={t('Add suggestion')}><Plus className="h-4 w-4" /></button>
        </form>
      ) : canVote ? (
        <button type="button" className="mt-3 flex items-center gap-2 py-1 text-sm font-medium text-app-active" onClick={() => setIsSuggesting(true)}>
          <Plus className="h-4 w-4" />
          {t('Suggest a dish')}
        </button>
      ) : null}

      <button type="button" className="secondary-button mt-4 w-full" onClick={chooseWinner} disabled={!canDecide || decision.options.length === 0 || isChoosing}>
        <Trophy className="h-4 w-4 text-app-orange" />
        {t(canDecide ? 'Choose current winner' : 'Only the owner can choose the winner')}
      </button>

      {isOwnerInfoOpen ? createPortal(
        <div className="modal-backdrop fixed inset-0 z-[80] grid place-items-center px-5" onClick={() => setIsOwnerInfoOpen(false)}>
          <div className="identity-dialog" role="dialog" aria-modal="true" aria-label={t('Vote details')} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="icon-button absolute right-3 top-3" aria-label={t('Close')} onClick={() => setIsOwnerInfoOpen(false)}><X className="h-4 w-4" /></button>
            <Heading level={3} className="pr-10 text-lg leading-snug">{decision.title}</Heading>
            <div className="mt-4 flex items-center gap-3">
              {owner?.avatarUrl ? <img className="h-10 w-10 rounded-full object-cover" src={owner.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-app-purple/10 font-semibold text-app-purple">{ownerName.slice(0, 1).toUpperCase()}</div>}
              <div className="min-w-0">
                <Text className="text-xs">{t('Vote owner')}</Text>
                <Text className="font-semibold text-app-fg">{ownerName}</Text>
              </div>
            </div>
            <div className="mt-4 border-t border-app-contrast/10 pt-3">
              <Text className="text-xs">{t('Can vote')}</Text>
              <Text className="mt-1 font-semibold text-app-fg">{eligibleNames.length ? eligibleNames.join(', ') : t('The whole family')}</Text>
            </div>
          </div>
        </div>, document.body
      ) : null}
    </GlassCard>
  );
}
