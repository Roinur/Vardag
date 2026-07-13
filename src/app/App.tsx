import { useCallback, useEffect, useState } from 'react';
import { routes, type PageId } from './routes';
import { AuthProvider } from './AuthContext';
import { I18nProvider, useI18n } from './I18nContext';
import { VardagDataProvider, useVardagData } from './VardagDataContext';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { Text } from '../components/Typography';
import { EventsPage } from '../features/events/EventsPage';
import { FoodPage } from '../features/food/FoodPage';
import { SettingsModal } from '../features/settings/SettingsModal';
import { ShoppingPage } from '../features/shopping/ShoppingPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { TodayPage } from '../features/today/TodayPage';

export type ThemeMode = 'system' | 'dark' | 'light';

function ActivePage({ page }: { page: PageId }) {
  if (page === 'tasks') return <TasksPage />;
  if (page === 'events') return <EventsPage />;
  if (page === 'shopping') return <ShoppingPage />;
  if (page === 'food') return <FoodPage />;
  return <TodayPage />;
}

function AppContent() {
  const { isLoading } = useVardagData();
  const { t } = useI18n();
  const readPageFromUrl = (): PageId => {
    const requested = new URLSearchParams(window.location.search).get('page');
    return routes.some((route) => route.id === requested) ? requested as PageId : 'today';
  };
  const pageUrl = (nextPage: PageId): string => nextPage === 'today' ? window.location.pathname : `${window.location.pathname}?page=${nextPage}`;
  const [page, setPage] = useState<PageId>(readPageFromUrl);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('vardag-theme');
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'system';
  });

  useEffect(() => {
    window.history.replaceState({ ...window.history.state, vardagPage: page }, '', pageUrl(page));
    const handlePopState = (event: PopStateEvent) => {
      const nextPage = event.state?.vardagPage as PageId | undefined;
      setPage(nextPage && routes.some((route) => route.id === nextPage) ? nextPage : readPageFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((nextPage: PageId) => {
    setPage((currentPage) => {
      if (currentPage === nextPage) return currentPage;
      window.history.pushState({ ...window.history.state, vardagPage: nextPage }, '', pageUrl(nextPage));
      return nextPage;
    });
  }, []);

  useEffect(() => {
    const themeMetas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('vardag-theme');
      themeMetas[0]?.setAttribute('content', '#101114');
      themeMetas[1]?.setAttribute('content', '#f7f8fa');
      return;
    }

    document.documentElement.dataset.theme = theme;
    localStorage.setItem('vardag-theme', theme);
    themeMetas.forEach((meta) => meta.setAttribute('content', theme === 'light' ? '#f7f8fa' : '#101114'));
  }, [theme]);

  return (
    <>
      <AppShell activePage={page} onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)}>
        {isLoading ? (
          <div className="pt-40">
            <GlassCard>
              <Text className="text-center text-app-fg">{t('Loading')} Vardag...</Text>
            </GlassCard>
          </div>
        ) : (
          <div key={page} className="page-enter">
            <ActivePage page={page} />
          </div>
        )}
      </AppShell>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />
    </>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <VardagDataProvider>
          <AppContent />
        </VardagDataProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
