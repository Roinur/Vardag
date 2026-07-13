import type {
  EventSuggestion,
  FoodSuggestion,
  MealType,
  ShoppingSuggestion,
  Suggestion,
  SuggestionType,
  TaskSuggestion
} from '../types/models';
import { parseDatePhrase, parseTimePhrase, stripDateAndTimeWords } from './dateParser';
import { todayISO, titleCase, uid } from './utils';

const sentenceSplitPattern = /(?:\r?\n|;|[!?]+|\.(?=\s|$))/u;
const itemSplitPattern = /\s*(?:,|\boch\b|\band\b|&|\+)\s*/iu;

// Only split on conjunctions when the next clause starts with a clear new action.
// This preserves lists such as "mjölk och ris" while separating mixed intents.
const intentStart = '(?:task\s*:|todo\s*:|event\s*:|shopping\s*:|food\s*:|mat\s*:|köp\s*:|kop\s*:|köp|kop|köpa|kopa|handla|buy|boka|book|ring|call|maila|email|fixa|gör|gor|skriv|lämna|lamna|kom ihåg|kom ihag|remember|åt|ate|lagade|lunch blev|middag blev|frukost blev)';
const conjunctionIntentSplit = new RegExp(`\\s+(?:och|and|sedan|sen|then)\\s+(?=${intentStart}\\b)`, 'iu');
const commaIntentSplit = new RegExp(`\\s*,\\s*(?=${intentStart}\\b)`, 'iu');

const shoppingTrigger = /\b(köp|kop|köpa|kopa|handla|inköpslista|lägg till .+ på inköpslistan|lagg till .+ pa inkopslistan|behöver köpa|behover kopa|ska köpa|ska kopa|need to buy|buy|shopping|groceries)\b/iu;
const taskTrigger = /\b(måste|maste|behöver|behover|ska|borde|uppgift|läxa|laxa|lämna in|lamna in|fixa|gör|gor|skriv|todo|readme|assignment|ring|ringa|call|maila|email|kom ihåg|kom ihag|påminn mig att|paminn mig att|remember|boka|book)\b/iu;
const eventTrigger = /\b(middag hos|middag med|lunch med|fika med|tandläkare|tandlakare|möte|mote|event|händelse|handelse|kalas|bio|movie|gym med|träning med|traning med|appointment|dinner at|dinner with|meeting)\b/iu;
const foodActionTrigger = /(?:^|[\s,(])(åt|ate|lagade|middag blev|lunch blev|frukost blev|dinner was)(?=$|[\s,.)])/iu;
const foodTrigger = /(?:^|[\s,(])(frukost|breakfast|lunch|middag|dinner|snack|leftover|rester|måltid|maltid)(?=$|[\s,.)])/iu;

const explicitTypes: Record<string, SuggestionType> = {
  task: 'task',
  todo: 'task',
  uppgift: 'task',
  event: 'event',
  händelse: 'event',
  handelse: 'event',
  shopping: 'shopping',
  köp: 'shopping',
  kop: 'shopping',
  handla: 'shopping',
  food: 'food',
  mat: 'food',
  måltid: 'food',
  maltid: 'food'
};

const explicitPattern = /^\s*(task|todo|uppgift|event|händelse|handelse|shopping|köp|kop|handla|food|mat|måltid|maltid)\s*:\s*(.+)$/iu;

const categoryForTask = (text: string): string | undefined => {
  const normalized = text.toLowerCase();
  if (/\b(matte[\p{L}]*|school|skola|läxa|laxa|[\p{L}]*uppgift(?:en)?|exam|prov)\b/u.test(normalized)) return 'School';
  if (/\b(workout|gym|träning|traning|health|tand)\b/u.test(normalized)) return 'Health';
  if (/\b(jobb|work|office|kund|client)\b/u.test(normalized)) return 'Work';
  return undefined;
};

const categoryForEvent = (text: string): string | undefined => {
  const normalized = text.toLowerCase();
  if (/\b(tand|gym|health|träning|traning)\b/u.test(normalized)) return 'Health';
  if (/\b(movie|bio|cinema)\b/u.test(normalized)) return 'Leisure';
  if (/\b(mamma|pappa|mom|dad|family|kalas|birthday)\b/u.test(normalized)) return 'Personal';
  if (/\b(jobb|work|office|kund|client|meeting|möte|mote)\b/u.test(normalized)) return 'Work';
  return undefined;
};

const categoryForShopping = (text: string): string => {
  const normalized = text.toLowerCase();
  if (/\b(batteri(?:er)?|batteries|shampoo|schampo|soap|tvål|tval|cleaner|diskmedel|toalett)\b/u.test(normalized)) return 'Household';
  if (/\b(gift|present|wrap|card|kort)\b/u.test(normalized)) return 'Other';
  return 'Groceries';
};

const mealTypeForFood = (text: string): MealType | undefined => {
  const normalized = text.toLowerCase();
  if (/\b(frukost|breakfast)\b/u.test(normalized)) return 'breakfast';
  if (/\blunch\b/u.test(normalized)) return 'lunch';
  if (/\b(middag|dinner)\b/u.test(normalized)) return 'dinner';
  if (/\b(snack|mellanmål|mellanmal)\b/u.test(normalized)) return 'snack';
  return undefined;
};

const priorityForTask = (text: string): 'low' | 'medium' | 'high' => {
  const normalized = text.toLowerCase();
  if (/\b(viktigt|akut|urgent|high|prov|exam|deadline)\b/u.test(normalized)) return 'high';
  if (/\b(borde|low|senare|någon gång|nagon gang)\b/u.test(normalized)) return 'low';
  return 'medium';
};

const cleanByType = (segment: string, type: SuggestionType): string => {
  const withoutDate = stripDateAndTimeWords(segment);
  const patterns: Record<SuggestionType, RegExp> = {
    shopping: /\b(lägg till|lagg till|på inköpslistan|pa inkopslistan|behöver köpa|behover kopa|ska köpa|ska kopa|need to buy|köp|kop|köpa|kopa|handla|buy|shopping|groceries)\b/giu,
    task: /\b(måste|maste|behöver|behover|ska|borde|todo|gör|gor|fixa|lämna in|lamna in|kom ihåg att|kom ihag att|påminn mig att|paminn mig att|remember to)\b/giu,
    event: /\b(event|händelse|handelse|appointment)\b/giu,
    food: /(?:^|\s)(?:åt|ate|lagade|middag blev|lunch blev|frukost blev|dinner was|for lunch|till lunch|till middag)\b|\b\d+\s*(?:portion|portioner|portions?)\s*(?:kvar|left)?\b/giu
  };
  return withoutDate
    .replace(patterns[type], '')
    .replace(/\s+/gu, ' ')
    .replace(/^[,:\-\s]+|[,:\-\s]+$/gu, '')
    .replace(/^(?:jag|vi|i|we)\s+/iu, '')
    .replace(type === 'event' ? /^(?:har|ska på|ska pa|ska till)\s+/iu : /$^/u, '')
    .trim();
};

const extractQuantity = (raw: string): { name: string; quantity?: string } => {
  const units = '(?:kg|g|mg|l|dl|cl|ml|liter|liters|st|stycken|pcs|pack|paket|flaska|flaskor|burk|burkar|x)';
  const numberWords: Record<string, number> = {
    en: 1, ett: 1, one: 1, två: 2, tva: 2, two: 2, tre: 3, three: 3,
    fyra: 4, four: 4, fem: 5, five: 5, sex: 6, six: 6, sju: 7, seven: 7,
    åtta: 8, atta: 8, eight: 8, nio: 9, nine: 9, tio: 10, ten: 10,
    elva: 11, eleven: 11, tolv: 12, twelve: 12
  };
  const wordQuantity = raw.match(new RegExp(`^([\\p{L}]+)(?:\\s+(${units}))?\\s+(.+)$`, 'iu'));
  if (wordQuantity) {
    const count = numberWords[wordQuantity[1].toLocaleLowerCase('sv')];
    if (count) return { name: wordQuantity[3].trim(), quantity: `${count} ${wordQuantity[2] ?? 'st'}` };
  }
  const leading = raw.match(new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*${units})\\s+(.+)$`, 'iu'));
  if (leading) return { name: leading[2].trim(), quantity: leading[1].replace(',', '.') };
  const bareLeading = raw.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/u);
  if (bareLeading) return { name: bareLeading[2].trim(), quantity: `${bareLeading[1].replace(',', '.')} st` };
  const trailing = raw.match(new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?\\s*${units})$`, 'iu'));
  if (trailing) return { name: trailing[1].trim(), quantity: trailing[2].replace(',', '.') };
  return { name: raw.trim() };
};

const detectShopping = (segment: string): ShoppingSuggestion[] => {
  const source = cleanByType(segment, 'shopping');
  return source
    .split(itemSplitPattern)
    .map(extractQuantity)
    .filter((item) => item.name.length > 0)
    .map(({ name, quantity }) => ({
      id: uid('sug_shop'),
      type: 'shopping',
      name: titleCase(name),
      quantity,
      category: categoryForShopping(name),
      scope: 'personal'
    }));
};

const detectTask = (segment: string): TaskSuggestion | undefined => {
  const title = titleCase(cleanByType(segment, 'task'));
  if (!title) return undefined;
  return {
    id: uid('sug_task'),
    type: 'task',
    title,
    dueDate: parseDatePhrase(segment),
    category: categoryForTask(segment),
    priority: priorityForTask(segment),
    scope: 'personal'
  };
};

const extractLocation = (segment: string): string | undefined => {
  const match = segment.match(/\b(?:hos|på|pa|at)\s+([\p{L}][\p{L}\d' -]{1,40})/u);
  if (!match) return undefined;
  const raw = match[1]
    .replace(/\b(?:idag|today|imorgon|tomorrow|måndag|mandag|tisdag|onsdag|torsdag|fredag|lördag|lordag|söndag|sondag|kl|klockan)\b.*$/iu, '')
    .trim();
  return raw ? titleCase(raw) : undefined;
};

const detectEvent = (segment: string): EventSuggestion | undefined => {
  const title = titleCase(cleanByType(segment, 'event'));
  if (!title) return undefined;
  return {
    id: uid('sug_event'),
    type: 'event',
    title,
    startDate: parseDatePhrase(segment) ?? todayISO(),
    startTime: parseTimePhrase(segment),
    location: extractLocation(segment),
    category: categoryForEvent(segment),
    scope: 'personal'
  };
};

const detectFood = (segment: string): FoodSuggestion | undefined => {
  const title = titleCase(cleanByType(segment, 'food'));
  if (!title) return undefined;
  const portionsMatch = segment.match(/\b(\d+)\s*(?:portion|portioner|portions?)\s*(?:kvar|left)?\b/iu);
  return {
    id: uid('sug_food'),
    type: 'food',
    title,
    mealType: mealTypeForFood(segment),
    eatenAt: parseDatePhrase(segment) ?? todayISO(),
    portionsLeft: portionsMatch ? Number(portionsMatch[1]) : undefined,
    scope: 'personal'
  };
};

const detectExplicit = (type: SuggestionType, content: string): Suggestion[] => {
  if (type === 'shopping') return detectShopping(content);
  if (type === 'event') return [detectEvent(content)].filter((item): item is EventSuggestion => Boolean(item));
  if (type === 'food') return [detectFood(content)].filter((item): item is FoodSuggestion => Boolean(item));
  return [detectTask(content)].filter((item): item is TaskSuggestion => Boolean(item));
};

export interface KnownPerson { id: string; name: string }

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const extractKnownPeople = (segment: string, people: KnownPerson[]): { text: string; matches: KnownPerson[] } => {
  const matches = people.filter((person) => new RegExp(`\\b(?:till|åt|för|at|for)\\s+${escapeRegExp(person.name)}\\b`, 'iu').test(segment));
  if (!matches.length) return { text: segment, matches };
  const names = matches.map((person) => escapeRegExp(person.name)).join('|');
  return {
    text: segment.replace(new RegExp(`\\s*\\b(?:till|åt|för|at|for)\\s+(?:${names})\\b`, 'giu'), '').replace(/\s+/gu, ' ').trim(),
    matches
  };
};

const detectSegment = (sourceSegment: string, people: KnownPerson[] = []): Suggestion[] => {
  const { text: segment, matches } = extractKnownPeople(sourceSegment, people);
  const assignment = matches.length ? {
    assigneeId: matches[0].id,
    assigneeName: matches[0].name,
    assigneeIds: matches.map((person) => person.id),
    assigneeNames: matches.map((person) => person.name),
    scope: 'family' as const
  } : {};
  const explicit = segment.match(explicitPattern);
  if (explicit) return detectExplicit(explicitTypes[explicit[1].toLocaleLowerCase('sv')], explicit[2]).map((suggestion) => ({ ...suggestion, ...assignment }));

  if (foodActionTrigger.test(segment)) {
    return [detectFood(segment)].filter((item): item is FoodSuggestion => Boolean(item)).map((suggestion) => ({ ...suggestion, ...assignment }));
  }
  if (shoppingTrigger.test(segment)) return detectShopping(segment).map((suggestion) => ({ ...suggestion, ...assignment }));
  if (taskTrigger.test(segment)) {
    return [detectTask(segment)].filter((item): item is TaskSuggestion => Boolean(item)).map((suggestion) => ({ ...suggestion, ...assignment }));
  }
  if (eventTrigger.test(segment) || parseTimePhrase(segment)) {
    return [detectEvent(segment)].filter((item): item is EventSuggestion => Boolean(item)).map((suggestion) => ({ ...suggestion, ...assignment }));
  }
  if (foodTrigger.test(segment)) {
    return [detectFood(segment)].filter((item): item is FoodSuggestion => Boolean(item)).map((suggestion) => ({ ...suggestion, ...assignment }));
  }

  return [detectTask(segment)].filter((item): item is TaskSuggestion => Boolean(item)).map((suggestion) => ({ ...suggestion, ...assignment }));
};

const splitIntentClauses = (segment: string): string[] =>
  segment
    .split(conjunctionIntentSplit)
    .flatMap((part) => part.split(commaIntentSplit))
    .map((part) => part.trim())
    .filter(Boolean);

export const parseEntryText = (rawText: string, people: KnownPerson[] = []): Suggestion[] => {
  const segments = rawText
    .split(sentenceSplitPattern)
    .flatMap(splitIntentClauses)
    .map((part) => part.trim())
    .filter(Boolean);
  const suggestions = segments.flatMap((segment) => detectSegment(segment, people));
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const title = suggestion.type === 'shopping' ? suggestion.name : suggestion.title;
    const key = `${suggestion.type}:${title.toLocaleLowerCase('sv')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
