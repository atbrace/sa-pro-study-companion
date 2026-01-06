"use client";

import { useState, useCallback } from 'react';
import type { TutorContext } from '@/lib/claude/prompts';

export function useTutor() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<TutorContext | undefined>();

  const openTutor = useCallback((tutorContext?: TutorContext) => {
    if (tutorContext) {
      setContext(tutorContext);
    }
    setIsOpen(true);
  }, []);

  const closeTutor = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updateContext = useCallback((newContext: TutorContext) => {
    setContext(newContext);
  }, []);

  return {
    isOpen,
    context,
    openTutor,
    closeTutor,
    updateContext,
  };
}
