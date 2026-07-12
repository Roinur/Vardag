import { CircleUserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PageId } from '../app/routes';
import { useI18n } from '../app/I18nContext';
import { BottomNav } from './BottomNav';
import { IconCircle } from './IconCircle';
import { useAuth } from '../app/AuthContext';

interface AppShellProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenSettings: () => void;
  children: ReactNode;
}

export function AppShell({ activePage, onNavigate, onOpenSettings, children }: AppShellProps) {
  const { t } = useI18n();
  const { user, householdMembers, avatarUrl: resolvedAvatarUrl } = useAuth();
  const profileAvatar = householdMembers.find((member) => member.id === user?.id)?.avatarUrl;
  const identityAvatar = user?.identities
    ?.map((identity) => identity.identity_data?.avatar_url ?? identity.identity_data?.picture)
    .find(Boolean);
  const avatarUrl = String(
    resolvedAvatarUrl
      || user?.user_metadata?.avatar_url
      || user?.user_metadata?.picture
      || identityAvatar
      || profileAvatar
      || ''
  );
  return (
    <div className="meta-app min-h-dvh w-full overflow-x-hidden text-app-fg">
      <main className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+0.9rem)] xs:px-5">
        <div className="relative flex-1">
          <div className="absolute right-0 top-3 z-10">
            {avatarUrl ? (
              <button type="button" className="profile-trigger" aria-label={t('Settings')} title={t('Settings')} onClick={onOpenSettings}>
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              </button>
            ) : (
              <IconCircle icon={CircleUserRound} label={t('Settings')} tone="muted" onClick={onOpenSettings} />
            )}
          </div>
          {children}
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[460px] px-0">
        <BottomNav activePage={activePage} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
