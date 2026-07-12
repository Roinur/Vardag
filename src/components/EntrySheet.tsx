import { X, type LucideIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../app/I18nContext';
import { useHistoryLayer } from '../lib/appHistory';
import { Heading, Text } from './Typography';

interface EntrySheetProps {
  isOpen: boolean;
  title: string;
  description?: string;
  icon: LucideIcon;
  toneClass?: string;
  onClose: () => void;
  children: ReactNode;
}

export function EntrySheet({
  isOpen,
  title,
  description,
  icon: Icon,
  toneClass = 'text-app-active',
  onClose,
  children
}: EntrySheetProps) {
  const { t } = useI18n();
  useHistoryLayer(isOpen, `sheet-${title}`, onClose);
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="entry-sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="entry-sheet" role="dialog" aria-modal="true" aria-labelledby="entry-sheet-title">
        <div className="entry-sheet-handle" />
        <header className="entry-sheet-header flex items-start gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-app-contrast/10 bg-app-contrast/5 ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <Heading level={2} id="entry-sheet-title" className="text-xl">
              {title}
            </Heading>
            {description ? <Text className="mt-0.5 text-sm">{description}</Text> : null}
          </div>
          <button type="button" className="icon-button" aria-label={t('Close')} onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="entry-sheet-content">{children}</div>
      </section>
    </div>,
    document.body
  );
}
