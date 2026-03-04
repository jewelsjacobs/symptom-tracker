import { createContext, useContext } from 'react';

type AppContextType = {
  completeOnboarding: () => void;
};

export const AppContext = createContext<AppContextType>({
  completeOnboarding: () => {},
});

export function useAppContext() {
  return useContext(AppContext);
}
