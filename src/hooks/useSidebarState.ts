'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY_DOMAINS = 'sidebar-expanded-domains';
const STORAGE_KEY_TOPICS = 'sidebar-expanded-topics';
const STORAGE_KEY_STUDY = 'sidebar-expanded-study';

export function useSidebarState(pathname: string) {
  // Study root expansion state
  // Always start collapsed on initial render to match server-side rendering
  // We'll restore from localStorage after hydration in useEffect
  const [isStudyExpanded, setIsStudyExpanded] = useState<boolean>(false);

  // Expanded domains - start empty to match server
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Expanded topics - start empty to match server
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Restore state from localStorage after hydration
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (hasHydrated) return;

    try {
      const storedStudy = localStorage.getItem(STORAGE_KEY_STUDY);
      if (storedStudy) {
        setIsStudyExpanded(JSON.parse(storedStudy));
      }

      const storedDomains = localStorage.getItem(STORAGE_KEY_DOMAINS);
      if (storedDomains) {
        setExpandedDomains(new Set(JSON.parse(storedDomains)));
      }

      const storedTopics = localStorage.getItem(STORAGE_KEY_TOPICS);
      if (storedTopics) {
        setExpandedTopics(new Set(JSON.parse(storedTopics)));
      }
    } catch {
      // Fail silently if localStorage is unavailable
    }

    setHasHydrated(true);
  }, [hasHydrated]);

  // Auto-expand based on current pathname
  useEffect(() => {
    // Parse pathname: /[exam]/study/domain-1/topic-2/section-3
    const match = pathname?.match(/^\/([^/]+)\/study\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);

    if (!match) return;

    // match[1] = examId, match[2] = domainId, match[3] = topicId
    const domainId = match[2];
    const topicId = match[3];

    // Batch state updates to prevent cascading re-renders
    // Only update if the value actually needs to change
    if (!isStudyExpanded) {
      setIsStudyExpanded(true);
    }

    if (domainId) {
      setExpandedDomains(prev => {
        if (prev.has(domainId)) return prev;
        return new Set([...prev, domainId]);
      });
    }

    if (topicId && domainId) {
      const topicKey = `${domainId}/${topicId}`;
      setExpandedTopics(prev => {
        if (prev.has(topicKey)) return prev;
        return new Set([...prev, topicKey]);
      });
    }
  }, [pathname]);

  // Persist all state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_STUDY, JSON.stringify(isStudyExpanded));
      localStorage.setItem(STORAGE_KEY_DOMAINS, JSON.stringify([...expandedDomains]));
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify([...expandedTopics]));
    } catch {
      // Fail silently if localStorage is unavailable
    }
  }, [isStudyExpanded, expandedDomains, expandedTopics, hasHydrated]);

  // Toggle functions
  const toggleStudy = () => setIsStudyExpanded(prev => !prev);

  const toggleDomain = (domainId: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const toggleTopic = (domainId: string, topicId: string) => {
    const topicKey = `${domainId}/${topicId}`;
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicKey)) {
        next.delete(topicKey);
      } else {
        next.add(topicKey);
      }
      return next;
    });
  };

  return {
    isStudyExpanded,
    expandedDomains,
    expandedTopics,
    toggleStudy,
    toggleDomain,
    toggleTopic,
  };
}
