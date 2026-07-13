import { CircleUserRound } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
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
  const avatarCandidates = useMemo(() => [...new Set([
    resolvedAvatarUrl,
    user?.user_metadata?.avatar_url,
    user?.user_metadata?.picture,
    identityAvatar,
    profileAvatar
  ].filter((value): value is string => typeof value === 'string' && value.length > 0))], [identityAvatar, profileAvatar, resolvedAvatarUrl, user?.user_metadata?.avatar_url, user?.user_metadata?.picture]);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [avatarAttempt, setAvatarAttempt] = useState(0);
  const avatarKey = avatarCandidates.join('|');
  useEffect(() => {
    setAvatarIndex(0);
    setAvatarAttempt((current) => current + 1);
  }, [avatarKey]);
  useEffect(() => {
    if (avatarCandidates.length === 0 || avatarIndex < avatarCandidates.length) return undefined;
    const retry = () => {
      setAvatarIndex(0);
      setAvatarAttempt((current) => current + 1);
    };
    const timer = window.setTimeout(retry, 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') retry();
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [avatarCandidates.length, avatarIndex]);
  const avatarUrl = avatarCandidates[avatarIndex];
  return (
    <div className="meta-app min-h-dvh w-full overflow-x-hidden text-app-fg">
      <main className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+0.9rem)] xs:px-5">
        <div className="relative flex-1">
          <div className="absolute right-0 top-3 z-10">
            {avatarUrl ? (
              <button type="button" className="profile-trigger" aria-label={t('Settings')} title={t('Settings')} onClick={onOpenSettings}>
                <img key={`${avatarUrl}-${avatarAttempt}`} src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setAvatarIndex((current) => current + 1)} />
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
