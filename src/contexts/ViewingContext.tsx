import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Context to track which chat/match the user is currently viewing
 * Used to avoid showing notifications for content the user is already viewing
 */
interface ViewingContextType {
  currentChatId: string | null;
  currentMatchId: string | null;
  setCurrentChatId: (chatId: string | null) => void;
  setCurrentMatchId: (matchId: string | null) => void;
}

const ViewingContext = createContext<ViewingContextType | undefined>(undefined);

/**
 * Provider component for viewing context
 */
export function ViewingProvider({ children }: { children: ReactNode }) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  return (
    <ViewingContext.Provider
      value={{
        currentChatId,
        currentMatchId,
        setCurrentChatId,
        setCurrentMatchId,
      }}
    >
      {children}
    </ViewingContext.Provider>
  );
}

/**
 * Hook to access viewing context
 */
export function useViewing() {
  const context = useContext(ViewingContext);
  if (context === undefined) {
    throw new Error('useViewing must be used within a ViewingProvider');
  }
  return context;
}

