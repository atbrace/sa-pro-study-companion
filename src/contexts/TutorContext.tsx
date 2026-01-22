'use client';

import { createContext, useContext } from 'react';
import type { TutorContext as TutorContextType } from '@/lib/llm';

interface TutorContextValue {
  openTutor: (context?: TutorContextType) => void;
  closeTutor: () => void;
  isOpen: boolean;
}

const TutorContext = createContext<TutorContextValue | null>(null);

export function TutorProvider({
  children,
  value
}: {
  children: React.ReactNode;
  value: TutorContextValue;
}) {
  return (
    <TutorContext.Provider value={value}>
      {children}
    </TutorContext.Provider>
  );
}

export function useTutorContext() {
  const context = useContext(TutorContext);
  if (!context) {
    throw new Error('useTutorContext must be used within TutorProvider');
  }
  return context;
}
