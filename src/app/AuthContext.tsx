import type { Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface HouseholdInfo {
  id: string;
  name: string;
  inviteCode: string;
}

export interface HouseholdMember {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role: 'owner' | 'member';
}

interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  avatarUrl: string;
  household: HouseholdInfo | null;
  householdMembers: HouseholdMember[];
  error: string;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  refreshHouseholdMembers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const canLoadAvatar = (url: string): Promise<boolean> => new Promise((resolve) => {
  const image = new Image();
  const timer = window.setTimeout(() => resolve(false), 4500);
  image.referrerPolicy = 'no-referrer';
  image.onload = () => { window.clearTimeout(timer); resolve(true); };
  image.onerror = () => { window.clearTimeout(timer); resolve(false); };
  image.src = url;
});

const parseHousehold = (value: unknown): HouseholdInfo | null => {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const data = row as Record<string, unknown>;
  if (typeof data.household_id !== 'string') return null;
  return {
    id: data.household_id,
    name: typeof data.household_name === 'string' ? data.household_name : 'My family',
    inviteCode: typeof data.invite_code === 'string' ? data.invite_code : ''
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const resolveGoogleAvatar = useCallback(async (nextSession: Session | null) => {
    if (!nextSession) {
      setAvatarUrl('');
      return;
    }
    const user = nextSession.user;
    const metadataAvatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
    const identityAvatar = user.identities
      ?.map((identity) => identity.identity_data?.avatar_url ?? identity.identity_data?.picture)
      .find(Boolean);
    const candidates = [...new Set([metadataAvatar, identityAvatar].filter((value): value is string => typeof value === 'string' && value.length > 0))];
    for (const candidate of candidates) {
      if (!await canLoadAvatar(candidate)) continue;
      setAvatarUrl(candidate);
      void supabase?.from('profiles').update({ avatar_url: candidate }).eq('id', user.id);
      return;
    }
    if (!nextSession.provider_token) {
      setAvatarUrl('');
      return;
    }
    try {
      const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${nextSession.provider_token}` }
      });
      if (!response.ok) return;
      const profile = await response.json() as { picture?: string };
      if (profile.picture && await canLoadAvatar(profile.picture)) {
        setAvatarUrl(profile.picture);
        void supabase?.from('profiles').update({ avatar_url: profile.picture }).eq('id', user.id);
      }
    } catch {
      // The generic profile icon remains available when Google userinfo is unreachable.
    }
  }, []);

  const loadHouseholdMembers = useCallback(async (householdId: string) => {
    if (!supabase) return;
    const { data: memberships, error: membershipError } = await supabase
      .from('household_members')
      .select('user_id, role')
      .eq('household_id', householdId);
    if (membershipError) throw membershipError;
    const ids = (memberships ?? []).map((row) => String(row.user_id));
    if (ids.length === 0) {
      setHouseholdMembers([]);
      return;
    }
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);
    if (profileError) throw profileError;
    const profileById = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
    setHouseholdMembers((memberships ?? []).map((membership) => {
      const id = String(membership.user_id);
      const profile = profileById.get(id);
      return {
        id,
        displayName: String(profile?.display_name ?? 'Family member'),
        avatarUrl: profile?.avatar_url ? String(profile.avatar_url) : undefined,
        role: membership.role === 'owner' ? 'owner' : 'member'
      };
    }));
  }, []);

  const ensureHousehold = useCallback(async () => {
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc('ensure_household');
    if (rpcError) throw rpcError;
    const nextHousehold = parseHousehold(data);
    setHousehold(nextHousehold);
    if (nextHousehold) await loadHouseholdMembers(nextHousehold.id);
  }, [loadHouseholdMembers]);

  const refreshHouseholdMembers = useCallback(async () => {
    if (household) await loadHouseholdMembers(household.id);
  }, [household, loadHouseholdMembers]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      void resolveGoogleAvatar(data.session);
      if (data.session) {
        try {
          await ensureHousehold();
        } catch (householdError) {
          setError(householdError instanceof Error ? householdError.message : 'Could not load family data.');
        }
      }
      if (active) setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void resolveGoogleAvatar(nextSession);
      setError('');
      if (nextSession) void ensureHousehold().catch((householdError) => {
        setError(householdError instanceof Error ? householdError.message : 'Could not load family data.');
      });
      else {
        setHousehold(null);
        setHouseholdMembers([]);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [ensureHousehold, resolveGoogleAvatar]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setError('Add the Supabase environment variables first.');
      return;
    }
    setError('');
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        scopes: 'openid email profile'
      }
    });
    if (signInError) setError(signInError.message);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  }, []);

  const visibleHouseholdMembers = useMemo(() => householdMembers.map((member) => (
    member.id === session?.user.id && avatarUrl
      ? { ...member, avatarUrl }
      : member
  )), [avatarUrl, householdMembers, session?.user.id]);

  const joinHousehold = useCallback(async (code: string) => {
    if (!supabase || !code.trim()) return;
    setError('');
    const { data, error: joinError } = await supabase.rpc('join_household', { join_code: code.trim() });
    if (joinError) {
      setError(joinError.message);
      return;
    }
    const nextHousehold = parseHousehold(data);
    setHousehold(nextHousehold);
    if (nextHousehold) await loadHouseholdMembers(nextHousehold.id);
  }, [loadHouseholdMembers]);

  const value = useMemo<AuthContextValue>(() => ({
    isConfigured: isSupabaseConfigured,
    isLoading,
    session,
    user: session?.user ?? null,
    avatarUrl,
    household,
    householdMembers: visibleHouseholdMembers,
    error,
    signInWithGoogle,
    signOut,
    joinHousehold,
    refreshHouseholdMembers
  }), [avatarUrl, error, household, isLoading, joinHousehold, refreshHouseholdMembers, session, signInWithGoogle, signOut, visibleHouseholdMembers]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
