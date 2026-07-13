import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'sv';

type Variables = Record<string, string | number>;

const sv: Record<string, string> = {
  Today: 'Idag', Tasks: 'Uppgifter', Events: 'Kalender', Shopping: 'Inköp', Food: 'Mat',
  Settings: 'Inställningar', Appearance: 'Utseende', Language: 'Språk', System: 'System', Dark: 'Mörkt', Light: 'Ljust',
  English: 'Engelska', Swedish: 'Svenska', Loading: 'Laddar', Overview: 'Översikt', Focus: 'Fokus',
  'To buy': 'Att köpa', 'Nothing urgent right now': 'Inget brådskande just nu',
  'Use the box below if something pops up.': 'Använd fältet nedan om något dyker upp.',
  'Write what is happening or what you need to remember...': 'Skriv vad som händer...',
  'Checking...': 'Kontrollerar...', 'Detect cards': 'Hitta kort', 'Detected Cards': 'Hittade kort', found: 'hittade',
  'On deck': 'På gång', 'Upcoming event': 'Kommande händelse', 'Shopping reminder': 'Inköpspåminnelse',
  'Could not find anything useful in that text.': 'Kunde inte hitta något användbart i texten.',
  today: 'Idag', upcoming: 'Kommande', completed: 'Slutförda',
  'tasks completed': 'uppgifter slutförda', 'Tasks left': 'Kvar', 'High priority': 'Hög prioritet',
  'Due today': 'Idag', Completed: 'Klart', "Today's Task": 'Dagens uppgift', "Today's Tasks": 'Dagens uppgifter', 'Add task': 'Lägg till',
  'No tasks here': 'Inga uppgifter här', 'Add one directly or use Detect Cards on Today.': 'Lägg till en direkt eller använd Hitta kort på Idag.',
  'New task': 'Ny uppgift', 'Add it directly with the details that matter.': 'Lägg till den direkt med rätt detaljer.',
  Task: 'Uppgift', 'What needs doing?': 'Vad behöver göras?', 'Due date': 'Förfallodatum', Priority: 'Prioritet',
  Category: 'Kategori', Low: 'Låg', Medium: 'Medel', High: 'Hög', Cancel: 'Avbryt',
  'This week': 'Den här veckan', "Today's Events": 'Dagens händelser', 'No events that day': 'Inga händelser den dagen',
  'Tap Add event to put something on this date.': 'Tryck på Lägg till för att skapa något på datumet.',
  'Add event': 'Lägg till', 'Date, time, place and category': 'Datum, tid, plats och kategori',
  'New event': 'Ny händelse', 'Plan it now without going through Detect Cards.': 'Planera direkt utan att gå via Hitta kort.',
  Event: 'Händelse', "What's happening?": 'Vad händer?', Date: 'Datum', Time: 'Tid', Location: 'Plats', Optional: 'Valfritt',
  'Groceries and essentials': 'Matvaror och vardagssaker', 'Quick add item...': 'Lägg till snabbt...',
  'Add item': 'Lägg till vara', 'Add with details': 'Lägg till med detaljer', 'Total items': 'Totalt', Bought: 'Köpt',
  Categories: 'Kategorier', Groceries: 'Matvaror', Household: 'Hushåll', Other: 'Övrigt', Clear: 'Rensa',
  item: 'vara', items: 'varor', 'Nothing here yet.': 'Inget här än.', 'Your list is empty': 'Inköpslistan är tom',
  'Add essentials from the quick field or Today parser.': 'Lägg till via snabbfältet eller Hitta kort på Idag.',
  'New shopping item': 'Ny inköpsvara', 'Add quantity and category before it reaches the list.': 'Lägg till mängd och kategori direkt.',
  Item: 'Vara', 'What do you need?': 'Vad behöver du?', Quantity: 'Mängd',
  'Meals and leftovers': 'Måltider och rester', 'Meals today': 'Måltider idag', 'Open votes': 'Öppna omröstningar',
  'Leftover portions': 'Portioner kvar', 'Last 7 days': 'Senaste 7 dagarna', 'Family meals': 'Familjens mat', 'Meal plans': 'Matplanering', New: 'Ny',
  'No meal decision yet': 'Inget matbeslut än', 'Decide a meal or start a family vote.': 'Bestäm en måltid eller starta en omröstning.',
  "Today's Meal": 'Dagens måltid', "Today's Meals": 'Dagens måltider', 'Add meal': 'Lägg till', 'No meals today': 'Inga måltider idag',
  'Add a meal or parse one from Today.': 'Lägg till en måltid eller använd Hitta kort på Idag.', Leftovers: 'Rester',
  'No leftovers': 'Inga rester', 'Add portions when logging a meal.': 'Ange portioner kvar när du loggar maten.',
  'Log food': 'Logga mat', 'Record a meal now, including anything left over.': 'Logga en måltid och eventuella rester.',
  Meal: 'Måltid', 'What did you eat?': 'Vad åt du?', 'Meal type': 'Typ av måltid', Notes: 'Anteckningar',
  'Portions left': 'Portioner kvar', Breakfast: 'Frukost', Lunch: 'Lunch', Dinner: 'Middag', Snack: 'Mellanmål',
  'Plan a family meal': 'Planera familjens mat', 'Choose directly or let everyone vote.': 'Bestäm direkt eller låt alla rösta.',
  'Decide meal': 'Bestäm mat', 'Start vote': 'Rösta', "We're having": 'Vi ska äta',
  Question: 'Fråga', Option: 'Alternativ', Dish: 'Maträtt', 'Set meal': 'Bestäm maten',
  'Card type': 'Korttyp', Add: 'Lägg till', Done: 'Klar', Edit: 'Redigera', Ignore: 'Ignorera',
  'Account & sync': 'Konto och synkning', Syncing: 'Synkar', Synced: 'Synkad', 'Sync issue': 'Synkfel', 'Local only': 'Endast lokalt',
  'Manage local Vardag data on this device.': 'Hantera Vardag-data och konto på den här enheten.',
  'Checking your account...': 'Kontrollerar ditt konto...', 'Family code': 'Familjekod', Join: 'Gå med',
  'Continue with Google': 'Fortsätt med Google', 'Clear all': 'Rensa allt', Confirm: 'Bekräfta',
  'Mark task done': 'Markera uppgift som klar', 'Mark task undone': 'Återställ uppgift', 'Delete task': 'Ta bort uppgift',
  'Mark item bought': 'Markera vara som köpt', 'Mark item to buy': 'Återställ vara', 'Delete item': 'Ta bort vara',
  'Delete event': 'Ta bort händelse', 'Delete food log': 'Ta bort matlogg', Close: 'Stäng',
  'Primary navigation': 'Huvudnavigation', Summary: 'Sammanfattning', 'Today overview': 'Översikt för idag',
  'Today counts': 'Antal idag', 'Overview pages': 'Översiktssidor', Show: 'Visa',
  '{count} more items': '{count} varor till', 'One more item': 'En vara till', 'Item to buy': 'Att köpa',
  '{count} card found': '{count} kort hittat', '{count} cards found': '{count} kort hittade', of: 'av', 'Task view': 'Uppgiftsvy',
  'Upcoming Tasks': 'Kommande uppgifter', 'Completed Tasks': 'Slutförda uppgifter',
  'Examples: Personal, School, Health or Work': 'Exempel: Personligt, Skola, Hälsa eller Arbete',
  'Examples: Personal, Health, Leisure or Work': 'Exempel: Personligt, Hälsa, Fritid eller Arbete',
  'Show events for': 'Visa händelser för', 'Examples: 2 kg, 1 pack or 3 bottles': 'Exempel: 2 kg, 1 paket eller 3 flaskor',
  Due: 'Förfaller', left: 'kvar', 'portion left': 'portion kvar', 'portions left': 'portioner kvar',
  '{meal} is decided': '{meal} är bestämd', 'What should we have for {meal}?': 'Vad ska vi äta till {meal}?',
  'Meal planning mode': 'Planeringsläge', 'Calories, storage details or anything useful later': 'Kalorier, förvaring eller annan användbar information',
  'This publishes the meal as decided.': 'Detta publicerar måltiden som bestämd.', 'Example: pancakes': 'Exempel: pannkakor',
  'Leave blank to use the default question.': 'Lämna tomt för standardfrågan.', optional: 'valfritt',
  '{meal} decided': '{meal} bestämd', '{meal} vote': 'Omröstning om {meal}', vote: 'röst', votes: 'röster',
  'Delete meal decision': 'Ta bort matbeslut', 'Delete vote': 'Ta bort omröstning',
  'Suggested by {name}': 'Föreslagen av {name}', 'Your suggestion': 'Ditt förslag', 'Add suggestion': 'Lägg till förslag',
  'Suggest a dish': 'Föreslå en rätt', 'Choose current winner': 'Välj nuvarande vinnare',
  '{name} owns this vote': '{name} äger omröstningen', 'Only the owner can choose the winner': 'Bara ägaren kan välja vinnaren',
  'Vote details': 'Omröstningsdetaljer', 'Vote owner': 'Ägare', 'Can vote': 'Får rösta', 'The whole family': 'Hela familjen',
  'Close settings': 'Stäng inställningar', 'Sign out': 'Logga ut', 'Join with family code': 'Gå med med familjekod',
  'Add the Supabase environment variables to enable Google sign-in and family sync.': 'Lägg till Supabase-miljövariabler för Google-inloggning och familjesynkning.',
  'Remove all local Vardag data?': 'Ta bort all lokal Vardag-data?', 'All data cleared.': 'All data har rensats.',
  'Google account': 'Google-konto', 'Copy family code': 'Kopiera familjekod', 'Sync now': 'Synka nu',
  'This device': 'Den här enheten', Family: 'Familj', Sharing: 'Delning',
  Personal: 'Personligt', School: 'Skola', Health: 'Hälsa', Work: 'Arbete', Leisure: 'Fritid',
  'Scan or photograph': 'Skanna eller fotografera', 'Point at a barcode or take a product photo.': 'Rikta kameran mot en streckkod eller ta en produktbild.',
  'Starting camera...': 'Startar kameran...', 'Camera unavailable. Choose a photo instead.': 'Kameran kunde inte starta. Välj en bild i stället.',
  'Looking up product...': 'Söker efter varan...', 'Product found': 'Vara hittad', 'Barcode found': 'Streckkod hittad',
  'Photo ready': 'Bilden är klar', 'Checking photo...': 'Kontrollerar bilden...', 'Product photo': 'Produktbild',
  'Unknown product': 'Okänd vara', 'Try again': 'Försök igen', 'Use item': 'Använd varan', 'Choose photo': 'Välj bild',
  'Take photo': 'Ta bild', 'Automatic barcode scanning is not supported in this browser.': 'Den här webbläsaren stöder inte automatisk streckkodsläsning.',
  'EAN-13, EAN-8 and UPC': 'EAN-13, EAN-8 och UPC',
  'View photo': 'Visa bild', 'Remove photo': 'Ta bort bild', 'Choose recipient': 'Välj mottagare', Everyone: 'Alla',
  'Family member': 'Familjemedlem', 'Use as': 'Använd som', 'Change card type': 'Ändra korttyp',
  'Confirmed card types': 'Bekräftade korttyper', and: 'och',
  'Who can vote?': 'Vem får rösta?', 'Only selected people can vote.': 'Endast valda personer kan rösta.',
  'No selection means the whole family.': 'Inget val betyder hela familjen.', 'Only selected family members can vote.': 'Endast valda familjemedlemmar kan rösta.',
  '{names} get to choose the meal': '{names} får välja mat',
  'How many leftovers were there from {meal}?': 'Hur många rester blev det av {meal}?',
  'Add one portion': 'Lägg till en portion', 'Remove one portion': 'Ta bort en portion',
  'Add category': 'Lägg till kategori', 'Category name': 'Kategorinamn', Dismiss: 'Dölj', Complete: 'Klar',
  'Repeat?': 'Upprepa?', 'Repeat none': 'Aldrig', 'Repeat daily': 'Dagligen', 'Repeat weekly': 'Varje vecka',
  'Repeat biweekly': 'Varannan vecka', 'Repeat monthly': 'Varje månad'
  , From: 'Från', 'One task today': 'En uppgift idag', '{count} tasks today': '{count} uppgifter idag'
  , Reminders: 'Påminnelser', 'Notifications off': 'Av', 'Notifications once': 'En gång',
  'Notifications hourly': 'Varje timme', 'Notifications threeHours': 'Var tredje timme',
  'Notifications sixHours': 'Var sjätte timme',
  'Controls reminders for unfinished tasks due today.': 'Styr påminnelser för ofärdiga uppgifter som ska göras idag.'
  , 'To {name}': 'Till {name}', 'From {name}': 'Från {name}',
  'Shared with family': 'Delad med familjen', 'Shared with selected people': 'Delad med valda personer', 'Family members': 'Familjemedlemmar',
  Owner: 'Ägare', Member: 'Medlem'
};

interface I18nContextValue {
  language: AppLanguage;
  locale: string;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, variables?: Variables) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const translate = (language: AppLanguage, key: string, variables?: Variables): string => {
  const template = language === 'sv' ? sv[key] ?? key : key;
  return Object.entries(variables ?? {}).reduce(
    (result, [name, replacement]) => result.split(`{${name}}`).join(String(replacement)),
    template
  );
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('vardag-language');
    if (saved === 'en' || saved === 'sv') return saved;
    return navigator.language.toLowerCase().startsWith('sv') ? 'sv' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('vardag-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    locale: language === 'sv' ? 'sv-SE' : 'en-US',
    setLanguage,
    t: (key, variables) => translate(language, key, variables)
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
