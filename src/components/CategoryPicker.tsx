import { Check, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../app/I18nContext';

const STORAGE_KEY = 'vardag-custom-categories';
const defaults = ['Personal', 'School', 'Health', 'Work', 'Leisure'];
const splitCategories = (value: string): string[] => value.split(',').map((item) => item.trim()).filter(Boolean);

export function CategoryPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
      return Array.isArray(saved) ? [...new Set([...defaults, ...saved.filter((item): item is string => typeof item === 'string')])] : defaults;
    } catch { return defaults; }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const selected = useMemo(() => splitCategories(value), [value]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(categories)); }, [categories]);

  const toggle = (category: string) => {
    const next = selected.includes(category) ? selected.filter((item) => item !== category) : [...selected, category];
    onChange(next.join(', '));
  };
  const create = () => {
    const category = draft.trim();
    if (!category) return;
    setCategories((current) => current.some((item) => item.toLowerCase() === category.toLowerCase()) ? current : [...current, category]);
    if (!selected.some((item) => item.toLowerCase() === category.toLowerCase())) onChange([...selected, category].join(', '));
    setDraft(''); setIsCreating(false);
  };

  return <div className="category-picker">
    <div className="category-pills">
      {categories.map((category) => {
        const active = selected.includes(category);
        return <button key={category} type="button" className={`category-pill ${active ? 'is-active' : ''}`} onClick={() => toggle(category)}>
          {active ? <Check className="h-3.5 w-3.5" /> : null}{t(category)}
        </button>;
      })}
      <button type="button" className="category-pill category-pill--add" aria-label={t('Add category')} onClick={() => setIsCreating(true)}><Plus className="h-4 w-4" /></button>
    </div>
    {isCreating ? <div className="category-create">
      <input className="form-control" value={draft} placeholder={t('Category name')} autoFocus onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); create(); }
        if (event.key === 'Escape') setIsCreating(false);
      }} />
      <button type="button" className="icon-button" aria-label={t('Add category')} onClick={create}><Check className="h-4 w-4" /></button>
    </div> : null}
  </div>;
}
