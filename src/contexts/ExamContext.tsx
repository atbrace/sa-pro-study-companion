'use client';

import { createContext, useContext } from 'react';
import type { ExamConfig } from '@/types/exam';

interface ExamContextValue {
  examId: string;
  config: ExamConfig;
}

const ExamContext = createContext<ExamContextValue | null>(null);

export function ExamProvider({
  children,
  examId,
  config,
}: {
  children: React.ReactNode;
  examId: string;
  config: ExamConfig;
}) {
  return (
    <ExamContext.Provider value={{ examId, config }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within ExamProvider');
  }
  return context;
}
