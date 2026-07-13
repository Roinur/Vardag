import type { Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface HouseholdInfo {
  id: string;
  name: string;
  inviteCode: string;
}

export interface HouseholdMember {
  id: string;
  displayName: string;
  legalName: string;
  nickname?: string;
  avatarUrl?: string;
  role: 'owner' | 'adult' | 'member';
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
  setMemberNickname: (memberId: string, nickname: string) => Promise<void>;
  setMemberRole: (memberId: string, role: 'adult' | 'member') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  const avatarResolutionRef = useRef(0);
  const avatarOwnerRef = useRef<string | null>(null);

  const resolveGoogleAvatar = useCallback(async (nextSession: Session | null) => {
    const resolutionId = ++avatarResolutionRef.current;
    if (!nextSession) {
      avatarOwnerRef.current = null;
      setAvatarUrl('');
      return;
    }
    const user = nextSession.user;
    if (avatarOwnerRef.current !== user.id) {
      avatarOwnerRef.current = user.id;
      setAvatarUrl('');
    }
    const metadataAvatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
    const identityAvatar = user.identities
      ?.map((identity) => identity.identity_data?.avatar_url ?? identity.identity_data?.picture)
      .find(Boolean);
    const directAvatar = [metadataAvatar, identityAvatar]
      .find((value): value is string => typeof value === 'string' && value.length > 0);
    if (directAvatar) {
      setAvatarUrl(directAvatar);
      void supabase?.from('profiles').update({ avatar_url: directAvatar }).eq('id', user.id);
      return;
    }

    try {
      if (nextSession.provider_token) {
        const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${nextSession.provider_token}` }
        });
        if (response.ok) {
          const googleProfile = await response.json() as { picture?: string };
          if (googleProfile.picture) {
            if (avatarResolutionRef.current === resolutionId) setAvatarUrl(googleProfile.picture);
            void supabase?.from('profiles').update({ avatar_url: googleProfile.picture }).eq('id', user.id);
            return;
          }
        }
      }

      const { data: profile } = await supabase!
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (avatarResolutionRef.current !== resolutionId) return;
      setAvatarUrl(typeof profile?.avatar_url === 'string' ? profile.avatar_url : '');
    } catch {
      // Keep the last known image during temporary Google or Supabase failures.
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
    const [{ data: profiles, error: profileError }, { data: aliases, error: aliasError }] = await Promise.all([
      supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids),
      supabase.from('household_member_aliases').select('target_user_id, alias').eq('household_id', householdId)
    ]);
    if (profileError) throw profileError;
    if (aliasError) throw aliasError;
    const profileById = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
    const aliasById = new Map((aliases ?? []).map((alias) => [String(alias.target_user_id), String(alias.alias)]));
    setHouseholdMembers((memberships ?? []).map((membership) => {
      const id = String(membership.user_id);
      const profile = profileById.get(id);
      return {
        id,
        legalName: String(profile?.display_name ?? 'Family member'),
        displayName: aliasById.get(id) ?? String(profile?.display_name ?? 'Family member'),
        nickname: aliasById.get(id),
        avatarUrl: profile?.avatar_url ? String(profile.avatar_url) : undefined,
        role: membership.role === 'owner' ? 'owner' : membership.role === 'adult' ? 'adult' : 'member'
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

  const setMemberNickname = useCallback(async (memberId: string, nickname: string) => {
    if (!supabase || !household || !session?.user.id) return;
    const clean = nickname.trim();
    const query = supabase.from('household_member_aliases');
    const { error: aliasError } = clean
      ? await query.upsert({ household_id: household.id, owner_user_id: session.user.id, target_user_id: memberId, alias: clean })
      : await query.delete().eq('household_id', household.id).eq('owner_user_id', session.user.id).eq('target_user_id', memberId);
    if (aliasError) throw aliasError;
    await loadHouseholdMembers(household.id);
  }, [household, loadHouseholdMembers, session?.user.id]);

  const setMemberRole = useCallback(async (memberId: string, role: 'adult' | 'member') => {
    if (!supabase || !household) return;
    const { error: roleError } = await supabase.rpc('set_household_member_role', { target_user: memberId, new_role: role });
    if (roleError) throw roleError;
    await loadHouseholdMembers(household.id);
  }, [household, loadHouseholdMembers]);

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
    , setMemberNickname, setMemberRole
  }), [avatarUrl, error, household, isLoading, joinHousehold, refreshHouseholdMembers, session, setMemberNickname, setMemberRole, signInWithGoogle, signOut, visibleHouseholdMembers]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
