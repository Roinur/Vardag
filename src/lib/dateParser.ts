import { addDays, toISODate, todayISO } from './utils';

const weekdayAliases: Record<string, number> = {
  sunday: 0,
  sun: 0,
  sondag: 0,
  'söndag': 0,
  monday: 1,
  mon: 1,
  mandag: 1,
  'måndag': 1,
  tuesday: 2,
  tue: 2,
  tisdag: 2,
  wednesday: 3,
  wed: 3,
  onsdag: 3,
  thursday: 4,
  thu: 4,
  torsdag: 4,
  friday: 5,
  fri: 5,
  fredag: 5,
  saturday: 6,
  sat: 6,
  lordag: 6,
  'lördag': 6
};

const weekdayWords = Object.keys(weekdayAliases).join('|');
const weekdayPattern = new RegExp(`\\b(?:på\\s+|pa\\s+|nästa\\s+|nasta\\s+|next\\s+)?(${weekdayWords})\\b`, 'iu');

const monthAliases: Record<string, number> = {
  januari: 1, january: 1, februari: 2, february: 2, mars: 3, march: 3,
  april: 4, maj: 5, may: 5, juni: 6, june: 6, juli: 7, july: 7,
  augusti: 8, august: 8, september: 9, oktober: 10, october: 10,
  november: 11, december: 12
};
const monthWords = Object.keys(monthAliases).join('|');
const writtenDatePattern = new RegExp(`\\b(?:den\\s+)?(\\d{1,2})(?::?e|:a|a|st|nd|rd|th)?\\s+(${monthWords})\\b`, 'iu');

const futureDate = (day: number, month: number, baseDate: Date): string | undefined => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  let year = baseDate.getFullYear();
  let candidate = new Date(year, month - 1, day);
  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return undefined;
  if (candidate < new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())) {
    year += 1;
    candidate = new Date(year, month - 1, day);
  }
  return toISODate(candidate);
};

export const parseDatePhrase = (text: string, baseDate = new Date()): string | undefined => {
  const normalized = text.toLowerCase();
  const isoMatch = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/u);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;

  const numericMatch = normalized.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](20\d{2}))?\b/u);
  if (numericMatch) {
    if (numericMatch[3]) {
      const date = new Date(Number(numericMatch[3]), Number(numericMatch[2]) - 1, Number(numericMatch[1]));
      if (date.getMonth() === Number(numericMatch[2]) - 1 && date.getDate() === Number(numericMatch[1])) return toISODate(date);
    }
    return futureDate(Number(numericMatch[1]), Number(numericMatch[2]), baseDate);
  }

  const writtenMatch = normalized.match(writtenDatePattern);
  if (writtenMatch) return futureDate(Number(writtenMatch[1]), monthAliases[writtenMatch[2]], baseDate);

  if (/\b(idag|today)\b/u.test(normalized)) return todayISO();
  if (/\b(imorgon|tomorrow)\b/u.test(normalized)) return toISODate(addDays(baseDate, 1));

  const relativeMatch = normalized.match(/\b(?:om|in)\s+(\d+)\s+(?:dag|dagar|day|days)\b/u);
  if (relativeMatch) return toISODate(addDays(baseDate, Number(relativeMatch[1])));

  const weekdayMatch = normalized.match(weekdayPattern);
  if (!weekdayMatch) return undefined;
  const weekday = weekdayAliases[weekdayMatch[1]];
  if (weekday === undefined) return undefined;

  let diff = weekday - baseDate.getDay();
  if (diff <= 0) diff += 7;
  return toISODate(addDays(baseDate, diff));
};

export const parseTimePhrase = (text: string): string | undefined => {
  const normalized = text.toLowerCase();
  const timeMatch = normalized.match(/\b(?:kl\.?|klockan|at)?\s*(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/u);
  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (timeMatch[3] === 'pm' && hours < 12) hours += 12;
    if (timeMatch[3] === 'am' && hours === 12) hours = 0;
    if (hours < 24 && minutes < 60) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const hourMatch = normalized.match(/\b(?:kl\.?|klockan|at)\s*(\d{1,2})\s*(am|pm)?\b/u);
  if (!hourMatch) return undefined;
  let hours = Number(hourMatch[1]);
  if (hourMatch[2] === 'pm' && hours < 12) hours += 12;
  if (hourMatch[2] === 'am' && hours === 12) hours = 0;
  return hours < 24 ? `${String(hours).padStart(2, '0')}:00` : undefined;
};

export const stripDateAndTimeWords = (text: string): string =>
  text
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/gu, '')
    .replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]20\d{2})?\b/gu, '')
    .replace(writtenDatePattern, '')
    .replace(/\b(idag|today|imorgon|tomorrow)\b/giu, '')
    .replace(/\b(?:om|in)\s+\d+\s+(?:dag|dagar|day|days)\b/giu, '')
    .replace(weekdayPattern, '')
    .replace(/\b(på|pa|on|till|due|by)\b\s*$/giu, '')
    .replace(/\b(?:kl\.?|klockan|at)\s*\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?\b/giu, '')
    .replace(/\s+/gu, ' ')
    .trim();
