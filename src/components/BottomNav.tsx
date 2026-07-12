import type { PageId } from '../app/routes';
import { routes } from '../app/routes';
import { useI18n } from '../app/I18nContext';
import { Text } from './Typography';

interface BottomNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label={t('Primary navigation')}>
      {routes.map((route) => {
        const isActive = route.id === activePage;
        const Icon = route.icon;
        return (
          <button
            key={route.id}
            type="button"
            className={[
              'nav-item flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center',
              isActive ? 'is-active text-app-active' : 'text-app-muted hover:text-app-fg'
            ].join(' ')}
            onClick={() => onNavigate(route.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
            <Text as="span" className={`nav-item-label ${isActive ? 'text-app-active' : ''}`}>
              {t(route.label)}
            </Text>
          </button>
        );
      })}
    </nav>
  );
}
