import type { SuggestionType } from '../types/models';

export interface IntentHint {
  start: number;
  end: number;
  trigger: string;
  consumeTrigger: boolean;
  candidates: SuggestionType[];
  sentenceIndex: number;
}

const rules: Array<{ pattern: RegExp; candidates: SuggestionType[]; consumeTrigger?: boolean }> = [
  { pattern: /(?<![\p{L}\p{N}])(köp|kop|köpa|kopa|handla|beställ|bestall|skaffa|buy|order)(?![\p{L}\p{N}])/iu, candidates: ['shopping'], consumeTrigger: true },
  { pattern: /(?<![\p{L}\p{N}])([åa]ka|boka|book|gå|ga|besöka|besoka|träffa|traffa|städa|stada|flytta|hämta|hamta|lämna|lamna)(?![\p{L}\p{N}])/iu, candidates: ['event', 'task'], consumeTrigger: true },
  { pattern: /(?<![\p{L}\p{N}])(möte|mote|kalas|tandläkare|tandlakare|bio|appointment)(?![\p{L}\p{N}])/iu, candidates: ['event'] },
  { pattern: /(?<![\p{L}\p{N}])(måste|maste|fixa|gör|gor|betala|tvätta|tvatta|plugga|läs|las|skriv|skicka|ring|ringa|maila|påminn|paminn|ordna|reparera)(?![\p{L}\p{N}])/iu, candidates: ['task'], consumeTrigger: true },
  { pattern: /(?<![\p{L}\p{N}])(åt|at|lagade|frukost|lunch|middag|snack)(?![\p{L}\p{N}])/iu, candidates: ['food'] },
  { pattern: /(?<![\p{L}\p{N}])(ägg|agg|mjölk|mjolk|ris|pasta|kyckling|bröd|brod|smör|smor|ost|tomat|potatis|lök|lok|banan|kaffe|yoghurt|yogurt|flour|sugar)(?![\p{L}\p{N}])/iu, candidates: ['shopping'] }
];

export const detectIntentHint = (text: string, excludedSentences: ReadonlySet<number> = new Set()): IntentHint | undefined => {
  const normalized = text.normalize('NFC');
  const matches: IntentHint[] = [];
  for (const rule of rules) {
    const pattern = new RegExp(rule.pattern.source, `${rule.pattern.flags.replace('g', '')}g`);
    for (const match of normalized.matchAll(pattern)) {
      if (match.index === undefined) continue;
      const sentenceIndex = normalized.slice(0, match.index).split(/[.!?\n]+/u).length - 1;
      if (excludedSentences.has(sentenceIndex)) continue;
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        trigger: match[0],
        consumeTrigger: Boolean(rule.consumeTrigger),
        candidates: rule.candidates,
        sentenceIndex
      });
    }
  }
  return matches.sort((a, b) => a.start - b.start)[0];
};

export const explicitIntentLabel: Record<SuggestionType, string> = {
  task: 'task',
  event: 'event',
  shopping: 'shopping',
  food: 'food'
};
