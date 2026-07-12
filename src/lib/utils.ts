export const uid = (prefix: string): string => {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${Date.now().toString(36)}_${random[0].toString(36)}${random[1].toString(36)}`;
};

export const todayISO = (): string => toISODate(new Date());

export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const dateTimeISO = (date = new Date()): string => date.toISOString();

export const formatShortDate = (isoDate?: string, locale = 'en-US'): string => {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00`);
  const today = todayISO();
  const tomorrow = toISODate(addDays(new Date(), 1));

  const isSwedish = locale.toLowerCase().startsWith('sv');
  if (isoDate === today) return isSwedish ? 'Idag' : 'Today';
  if (isoDate === tomorrow) return isSwedish ? 'Imorgon' : 'Tomorrow';

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const formatTime = (time?: string): string => {
  if (!time) return '';
  return time;
};

export const titleCase = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T): number =>
  b.createdAt.localeCompare(a.createdAt);

export const byDateAsc = <T extends { startDate?: string; dueDate?: string; eatenAt?: string }>(
  a: T,
  b: T
): number => {
  const aDate = a.startDate ?? a.dueDate ?? a.eatenAt ?? '';
  const bDate = b.startDate ?? b.dueDate ?? b.eatenAt ?? '';
  return aDate.localeCompare(bDate);
};
