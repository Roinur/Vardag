import type { RepeatRule } from '../types/models';
import { toISODate } from './utils';

const parseDate = (iso: string) => new Date(`${iso}T12:00:00`);

export const nextRecurringDate = (iso: string, repeat: RepeatRule): string => {
  const date = parseDate(iso);
  if (repeat === 'daily') date.setDate(date.getDate() + 1);
  if (repeat === 'weekly') date.setDate(date.getDate() + 7);
  if (repeat === 'biweekly') date.setDate(date.getDate() + 14);
  if (repeat === 'monthly') {
    const day = date.getDate();
    const targetMonth = date.getMonth() + 1;
    date.setDate(1);
    date.setMonth(targetMonth);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return toISODate(date);
};

export const occursOnDate = (startDate: string, repeat: RepeatRule | undefined, targetDate: string): boolean => {
  if (targetDate < startDate) return false;
  if (!repeat || repeat === 'none') return targetDate === startDate;
  const start = parseDate(startDate);
  const target = parseDate(targetDate);
  const days = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (repeat === 'daily') return true;
  if (repeat === 'weekly') return days % 7 === 0;
  if (repeat === 'biweekly') return days % 14 === 0;
  return start.getDate() === target.getDate() || (target.getMonth() !== start.getMonth() && target.getDate() === new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate() && start.getDate() > target.getDate());
};
