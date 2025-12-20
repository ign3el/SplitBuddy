import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, SubscriptionState, SubscriptionContextType } from '../types';
import api from '../lib/apiClient';

type ProfileRow = {
  user_id: string;
  is_pro: boolean;
  scans_used_this_month: number;
  max_scans_per_month: number;
  month_reset_date: string;
  name?: string;
  email?: string;
};

const LOCAL_KEY = 'splitbuddy_subscription';

const defaultState: SubscriptionState = {
  isLoggedIn: false,
  isPro: false,
  scansUsedThisMonth: 0,
  maxScansPerMonth: 5,
  monthResetDate: new Date().toISOString(),
};

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const normalizeProfile = (profile: ProfileRow) => {
  const now = new Date();
  const lastReset = profile.month_reset_date ? new Date(profile.month_reset_date) : now;
  let scansUsed = profile.scans_used_this_month ?? 0;
  let monthResetDate = lastReset.toISOString();

  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    scansUsed = 0;
    monthResetDate = now.toISOString();
  }

  return {
    isPro: !!profile.is_pro,
    scansUsedThisMonth: scansUsed,
    maxScansPerMonth: profile.max_scans_per_month || 5,
    monthResetDate,
  } satisfies Pick<SubscriptionState, 'isPro' | 'scansUsedThisMonth' | 'maxScansPerMonth' | 'monthResetDate'>;
};

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SubscriptionState>(defaultState);

  const healthCheck = async () => {
    try {
      const res = await api.ping();
      if (!res.ok) console.warn('API health check failed', res.message);
    } catch (err) {
      console.warn('API health check threw', err);
    }
  };

  // Rehydrate from localStorage quickly for perceived performance
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SubscriptionState;
        setState(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse subscription state', error);
      }
    }
  }, []);

  // Lightweight connectivity probe on mount
  useEffect(() => {
    void healthCheck();
  }, []);

  // Persist to localStorage for offline friendliness
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  }, [state]);

  const applyUserProfile = (user: { id: string; email: string; name?: string; createdAt: string }, profile: ProfileRow): void => {
    const appUser: User = { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
    const normalized = normalizeProfile(profile);
    setState(prev => ({ ...prev, ...normalized, isLoggedIn: true, user: appUser }));
  };

  const updateProfile = async (profile: { name?: string }): Promise<void> => {
    if (!state.user) throw new Error('No user found');
    const res = await api.updateProfile(profile);
    const user = res.user as { id: string; email: string; name?: string; created_at?: string };
    setState(prev => ({
      ...prev,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at ? new Date(user.created_at).toISOString() : prev.user!.createdAt,
      },
    }));
  };

  // Initialize auth state from API token
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const me = await api.me();
        if (me.user && me.profile && mounted) {
          const user = me.user as { id: string; email: string; name?: string; created_at: string };
          const profile = me.profile as ProfileRow;
          applyUserProfile({ id: user.id, email: user.email, name: user.name, createdAt: new Date(user.created_at).toISOString() }, profile);
        }
      } catch {}
    };

    void init();
    return () => { mounted = false; };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    if (!email || !password) throw new Error('Email and password required');
    const res = await api.login(email, password);
    const user = res.user as { id: string; email: string; name?: string; createdAt: string };
    const profile = res.profile as ProfileRow;
    applyUserProfile(user, profile);
  };

  const signUp = async (email: string, name: string, password: string): Promise<void> => {
    if (!email || !name || !password) throw new Error('All fields required');
    const res = await api.signUp(email, name, password);
    if (res.token && res.user && res.profile) {
      const user = res.user as { id: string; email: string; name?: string; createdAt: string };
      const profile = res.profile as ProfileRow;
      applyUserProfile(user, profile);
      return;
    }
    // Verification-first flow: no login until email is confirmed
    return;
  };

  const logout = async (): Promise<void> => {
    api.logout();
    setState(defaultState);
  };

  const upgradeToPro = async (_paymentToken: string): Promise<void> => {
    if (!state.user) throw new Error('No user found');
    // For MySQL-only mode, mark local state as pro. Server-side billing is out of scope here.
    setState(prev => ({ ...prev, isPro: true, scansUsedThisMonth: 0 }));
  };

  const useScan = async (): Promise<boolean> => {
    if (!state.isLoggedIn) return false;
    if (state.isPro) return true; // Pro users have unlimited scans
    try {
      const res = await api.incrementScan();
      setState(prev => ({ ...prev, scansUsedThisMonth: res.scans_used_this_month, maxScansPerMonth: res.max_scans_per_month }));
      return !!res.allowed;
    } catch (e) {
      console.error('Failed to persist scan count', e);
      // Optimistic: allow scan if under local limit
      if (state.scansUsedThisMonth < state.maxScansPerMonth) {
        setState(prev => ({ ...prev, scansUsedThisMonth: prev.scansUsedThisMonth + 1 }));
        return true;
      }
      return false;
    }
  };

  const resetMonthlyScans = (): void => {
    setState(prev => ({ ...prev, scansUsedThisMonth: 0, monthResetDate: new Date().toISOString() }));
    // Server auto-resets on increment check; explicit reset endpoint omitted.
  };

  const resendVerificationEmail = async (_email: string): Promise<void> => {
    throw new Error('Email verification is not implemented in MySQL mode.');
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    if (!email) throw new Error('Email is required');
    await api.requestPasswordReset(email);
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const result = await api.changePassword(currentPassword, newPassword);
    if (!result.ok) throw new Error(result.message || 'Failed to change password');
  };

  const saveSplitHistory = async (records: any[], detailedSplit: any): Promise<void> => {
    await api.saveSplitHistory(records, detailedSplit);
  };

  const getSplitHistory = async (): Promise<{ records: any[]; detailedSplits: any[] }> => {
    const result = await api.getSplitHistory();
    return { records: result.records || [], detailedSplits: result.detailedSplits || [] };
  };

  const clearSplitHistory = async (): Promise<void> => {
    await api.clearSplitHistory();
  };

  const ping = async (): Promise<{ ok: boolean; message: string }> => {
    try {
      return await api.ping();
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  };

  const contextValue: SubscriptionContextType = {
    ...state,
    login,
    signUp,
    logout,
    upgradeToPro,
    useScan,
    resetMonthlyScans,
    updateProfile,
    resendVerificationEmail,
    requestPasswordReset,
    changePassword,
    saveSplitHistory,
    getSplitHistory,
    clearSplitHistory,
    ping,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};
