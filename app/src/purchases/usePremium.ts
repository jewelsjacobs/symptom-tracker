import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isPremium } from './index';

/**
 * React hook: returns { premium, loading, refresh }
 * Re-checks whenever app comes to foreground (handles subscription changes).
 */
export function usePremium() {
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setPremium(await isPremium());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });

    return () => sub.remove();
  }, [refresh]);

  return { premium, loading, refresh };
}
