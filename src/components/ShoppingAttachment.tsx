import { Maximize2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../app/I18nContext';
import { useHistoryLayer } from '../lib/appHistory';

interface ShoppingAttachmentProps {
  src?: string;
  alt: string;
  onRemove?: () => void;
}

export function ShoppingAttachment({ src, alt, onRemove }: ShoppingAttachmentProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  useHistoryLayer(expanded, 'shopping-photo', () => setExpanded(false));
  useEffect(() => {
    if (!expanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [expanded]);
  if (!src) return null;

  return (
    <>
      <div className="shopping-attachment">
        <button type="button" className="shopping-attachment__preview" onClick={() => setExpanded(true)} aria-label={t('View photo')}>
          <img src={src} alt={alt} />
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        {onRemove ? (
          <button type="button" className="shopping-attachment__remove" onClick={onRemove} aria-label={t('Remove photo')}>
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {expanded ? createPortal(
        <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setExpanded(false)}>
          <img src={src} alt={alt} onClick={(event) => event.stopPropagation()} />
          <button type="button" className="icon-button photo-viewer__close" onClick={() => setExpanded(false)} aria-label={t('Close')}>
            <X className="h-5 w-5" />
          </button>
        </div>,
        document.body
      ) : null}
    </>
  );
}
