import type { FoodDecision } from '../types/models';
import { uid } from './utils';

export const applyFoodVote = (decision: FoodDecision, optionId: string, voterId: string): FoodDecision => ({
  ...decision,
  options: decision.options.map((option) => ({
    ...option,
    voterIds: option.id === optionId
      ? Array.from(new Set([...option.voterIds.filter((id) => id !== voterId), voterId]))
      : option.voterIds.filter((id) => id !== voterId)
  }))
});

export const appendFoodOption = (decision: FoodDecision, title: string, suggestedBy: string): FoodDecision => ({
  ...decision,
  options: [...decision.options, { id: uid('option'), title: title.trim(), voterIds: [], suggestedBy }]
});

export const decideFoodWinner = (decision: FoodDecision, optionId?: string): FoodDecision => {
  const winner = optionId
    ? decision.options.find((option) => option.id === optionId)
    : [...decision.options].sort((a, b) => b.voterIds.length - a.voterIds.length)[0];
  return { ...decision, status: 'decided', decidedMeal: winner?.title ?? decision.decidedMeal };
};
