import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isPremium } from './index';

type PremiumContextType = {
  premium: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextType>({
  premium: false,
  loading: true,
  refresh: async () => {},
});

// Set to true temporarily for screenshots, then back to false before submitting
const FORCE_PREMIUM = false;

/**
 * Provider that holds global premium state.
 * Wrap your app root with this so all screens share the same state.
 */
export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [premium, setPremium] = useState(FORCE_PREMIUM);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await isPremium();
    setPremium(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });

    return () => sub.remove();
  }, [refresh]);

  return (
    <PremiumContext.Provider value={{ premium, loading, refresh }}>
      {children}
    </PremiumContext.Provider>
  );
}

/**
 * React hook: returns { premium, loading, refresh }
 * Now reads from shared context so all screens update together.
 */
export function usePremium() {
  return useContext(PremiumContext);
}
