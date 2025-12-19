import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, SubscriptionState, SubscriptionContextType } from '../types';

const defaultState: SubscriptionState = {
  isLoggedIn: false,
  isPro: false,
  scansUsedThisMonth: 0,
  maxScansPerMonth: 5,
  monthResetDate: new Date().toISOString(),
};

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SubscriptionState>(defaultState);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('splitbuddy_subscription');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SubscriptionState;
        // Check if month has rolled over
        const lastReset = new Date(parsed.monthResetDate);
        const now = new Date();
        if (
          now.getMonth() !== lastReset.getMonth() ||
          now.getFullYear() !== lastReset.getFullYear()
        ) {
          // Reset monthly scans
          parsed.scansUsedThisMonth = 0;
          parsed.monthResetDate = now.toISOString();
        }
        setState(parsed);
      } catch (error) {
        console.error('Failed to parse subscription state', error);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('splitbuddy_subscription', JSON.stringify(state));
  }, [state]);

  const login = async (email: string, password: string): Promise<void> => {
    // Simulated login; in production, call your auth backend
    if (!email || !password) throw new Error('Email and password required');
    const user: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      email,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      isLoggedIn: true,
      user,
      isPro: false,
    }));
  };

  const signUp = async (
    email: string,
    name: string,
    password: string
  ): Promise<void> => {
    // Simulated sign-up; in production, call your auth backend
    if (!email || !name || !password)
      throw new Error('All fields required');
    const user: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      email,
      name,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      isLoggedIn: true,
      user,
      isPro: false,
    }));
  };

  const logout = (): void => {
    setState(defaultState);
  };

  const upgradeToPro = async (paymentToken: string): Promise<void> => {
    // Simulated upgrade; in production, process payment with Stripe/PayPal
    if (!paymentToken) throw new Error('Payment token required');
    setState(prev => ({
      ...prev,
      isPro: true,
      scansUsedThisMonth: 0,
      maxScansPerMonth: Infinity,
    }));
  };

  const useScan = (): boolean => {
    if (!state.isLoggedIn) return false;
    if (state.isPro) return true; // Pro users have unlimited scans
    if (state.scansUsedThisMonth >= state.maxScansPerMonth) return false;

    // Increment scans used
    setState(prev => ({
      ...prev,
      scansUsedThisMonth: prev.scansUsedThisMonth + 1,
    }));
    return true;
  };

  const resetMonthlyScans = (): void => {
    setState(prev => ({
      ...prev,
      scansUsedThisMonth: 0,
      monthResetDate: new Date().toISOString(),
    }));
  };

  const contextValue: SubscriptionContextType = {
    ...state,
    login,
    signUp,
    logout,
    upgradeToPro,
    useScan,
    resetMonthlyScans,
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
