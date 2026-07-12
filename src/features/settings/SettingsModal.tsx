import { Bell, Cloud, Copy, LogIn, LogOut, RefreshCw, Trash2, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ThemeMode } from '../../app/App';
import { useAuth } from '../../app/AuthContext';
import { type AppLanguage, useI18n } from '../../app/I18nContext';
import { useVardagData } from '../../app/VardagDataContext';
import type { NotificationFrequency } from '../../app/VardagDataContext';
import { GlassCard } from '../../components/GlassCard';
import { SlidingControl } from '../../components/SlidingControl';
import { Heading, Text } from '../../components/Typography';
import { useHistoryLayer } from '../../lib/appHistory';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

const themeOptions: ThemeMode[] = ['system', 'dark', 'light'];
const languageOptions: AppLanguage[] = ['en', 'sv'];

export function SettingsModal({ isOpen, onClose, theme, onThemeChange }: SettingsModalProps) {
  const { language, setLanguage, t } = useI18n();
  const { clearData, cloudStatus, cloudError, syncNow, notificationFrequency, setNotificationFrequency } = useVardagData();
  const { isConfigured, isLoading: authLoading, user, avatarUrl, household, householdMembers, error: authError, signInWithGoogle, signOut, joinHousehold, refreshHouseholdMembers } = useAuth();
  const [message, setMessage] = useState('');
  const [pendingClear, setPendingClear] = useState(false);
  const [familyCode, setFamilyCode] = useState('');
  const [showFamily, setShowFamily] = useState(false);
  useHistoryLayer(isOpen, 'settings', onClose);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClear = async () => {
    await clearData();
    setPendingClear(false);
    setMessage(t('All data cleared.'));
  };

  return (
    <div className="modal-backdrop inset-0 z-50 flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
      <GlassCard className="modal-panel max-h-[calc(100dvh-2rem)] w-full max-w-[430px] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="mb-5 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Heading level={2} id="settings-title" className="text-2xl">
              {t('Settings')}
            </Heading>
            <Text className="mt-1">{t('Manage local Vardag data on this device.')}</Text>
          </div>
          <button
            type="button"
            aria-label={t('Close settings')}
            title={t('Close settings')}
            className="rounded-full p-2 text-app-muted transition hover:bg-app-contrast/10 hover:text-app-fg"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]">{t('Appearance')}</Text>
          <SlidingControl
            value={theme}
            options={themeOptions.map((option) => ({
              value: option,
              label: t(option.slice(0, 1).toUpperCase() + option.slice(1))
            }))}
            onChange={onThemeChange}
            ariaLabel={t('Appearance')}
          />
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-app-active" />
            <Text className="text-xs font-semibold uppercase tracking-[0.12em]">{t('Reminders')}</Text>
          </div>
          <select className="form-control" value={notificationFrequency} onChange={(event) => setNotificationFrequency(event.target.value as NotificationFrequency)}>
            {(['off', 'once', 'hourly', 'threeHours', 'sixHours'] as NotificationFrequency[]).map((frequency) => (
              <option key={frequency} value={frequency}>{t(`Notifications ${frequency}`)}</option>
            ))}
          </select>
          <Text className="mt-1.5 text-xs">{t('Controls reminders for unfinished tasks due today.')}</Text>
        </div>

        <div className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]">{t('Language')}</Text>
          <SlidingControl
            value={language}
            options={languageOptions.map((option) => ({
              value: option,
              label: option === 'sv' ? t('Swedish') : t('English')
            }))}
            onChange={setLanguage}
            ariaLabel={t('Language')}
          />
        </div>

        <section className="mb-4 border-y border-app-contrast/10 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Cloud className="h-5 w-5 text-app-active" />
            <Text className="font-semibold text-app-fg">{t('Account & sync')}</Text>
            <Text as="span" className={`ml-auto text-xs ${cloudStatus === 'error' ? 'text-app-red' : cloudStatus === 'synced' ? 'text-app-green' : ''}`}>
              {t(cloudStatus === 'syncing' ? 'Syncing' : cloudStatus === 'synced' ? 'Synced' : cloudStatus === 'error' ? 'Sync issue' : 'Local only')}
            </Text>
          </div>

          {!isConfigured ? (
            <Text className="text-sm">{t('Add the Supabase environment variables to enable Google sign-in and family sync.')}</Text>
          ) : authLoading ? (
            <Text className="text-sm">{t('Checking your account...')}</Text>
          ) : user ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img className="h-10 w-10 rounded-full object-cover" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-app-active/12 text-sm font-semibold text-app-active">
                    {String(user.user_metadata.full_name ?? user.email ?? 'V').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Text className="truncate font-semibold text-app-fg">{String(user.user_metadata.full_name ?? t('Google account'))}</Text>
                  <Text className="truncate text-xs">{user.email}</Text>
                </div>
                <button type="button" className="icon-button" aria-label={t('Sign out')} onClick={signOut}><LogOut className="h-4 w-4" /></button>
              </div>

              {household ? (
                <div className="flex items-center gap-2 rounded-2xl border border-app-contrast/10 bg-app-contrast/[0.035] px-3 py-2.5">
                  <Users className="h-4 w-4 text-app-purple" />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setShowFamily(true); void refreshHouseholdMembers(); }}>
                    <Text className="text-xs">{t('Family code')}</Text>
                    <Text className="font-semibold tracking-[0.12em] text-app-fg">{household.inviteCode}</Text>
                  </button>
                  <button type="button" className="icon-button" aria-label={t('Copy family code')} onClick={() => navigator.clipboard?.writeText(household.inviteCode)}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" className="icon-button" aria-label={t('Sync now')} onClick={syncNow}>
                    <RefreshCw className={`h-4 w-4 ${cloudStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : null}

              <div className="flex gap-2">
                <input className="form-control" placeholder={t('Join with family code')} value={familyCode} onChange={(event) => setFamilyCode(event.target.value.toUpperCase())} />
                <button type="button" className="secondary-button shrink-0" disabled={!familyCode.trim()} onClick={() => joinHousehold(familyCode)}>{t('Join')}</button>
              </div>
            </div>
          ) : (
            <button type="button" className="primary-button w-full" onClick={signInWithGoogle}>
              <LogIn className="h-4 w-4" />
              {t('Continue with Google')}
            </button>
          )}

          {authError || cloudError ? <Text className="mt-2 text-sm text-app-red" role="status">{authError || cloudError}</Text> : null}
        </section>

        <div>
          <button
            type="button"
            onClick={() => setPendingClear(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-app-red/25 bg-app-red/10 px-3 py-3 text-sm font-semibold text-app-red"
          >
            <Trash2 className="h-4 w-4" />
            {t('Clear all')}
          </button>
        </div>

        {pendingClear ? (
          <div className="mt-3 rounded-2xl border border-app-red/20 bg-app-red/[0.07] p-3">
            <Text className="text-sm text-app-fg">
              {t('Remove all local Vardag data?')}
            </Text>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="rounded-xl border border-app-contrast/10 px-3 py-2 text-sm text-app-muted" onClick={() => setPendingClear(false)}>
                {t('Cancel')}
              </button>
              <button
                type="button"
                className="rounded-xl bg-app-red px-3 py-2 text-sm font-semibold text-[#061528]"
                onClick={handleClear}
              >
                {t('Confirm')}
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <Text className="mt-2 text-sm text-app-green" role="status">
            {message}
          </Text>
        ) : null}

        {showFamily ? (
          <div className="modal-backdrop fixed inset-0 z-[80] grid place-items-center px-5" onClick={() => setShowFamily(false)}>
            <div className="identity-dialog" role="dialog" aria-modal="true" aria-label={t('Family members')} onClick={(event) => event.stopPropagation()}>
              <button type="button" className="icon-button absolute right-3 top-3" aria-label={t('Close')} onClick={() => setShowFamily(false)}><X className="h-4 w-4" /></button>
              <Heading level={3} className="pr-10 text-lg">{t('Family members')}</Heading>
              <Text className="mt-1 text-sm">{household?.inviteCode}</Text>
              <div className="mt-4 grid gap-2">
                {householdMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 py-1.5">
                    {member.avatarUrl ? <img className="h-9 w-9 rounded-full object-cover" src={member.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div className="grid h-9 w-9 place-items-center rounded-full bg-app-purple/10"><Users className="h-4 w-4 text-app-purple" /></div>}
                    <Text className="min-w-0 flex-1 truncate font-semibold text-app-fg">{member.displayName}</Text>
                    <Text className="text-xs">{t(member.role === 'owner' ? 'Owner' : 'Member')}</Text>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
