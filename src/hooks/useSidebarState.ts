'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY_DOMAINS = 'sidebar-expanded-domains';
const STORAGE_KEY_TOPICS = 'sidebar-expanded-topics';
const STORAGE_KEY_STUDY = 'sidebar-expanded-study';

export function useSidebarState(pathname: string) {
  // Study root expansion state
  const [isStudyExpanded, setIsStudyExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STUDY);
      // Default to expanded if on study page, otherwise use stored value or collapsed
      if (pathname?.startsWith('/study')) return true;
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  // Expanded domains
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DOMAINS);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Expanded topics (stored as "domainId/topicId")
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TOPICS);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Auto-expand based on current pathname
  useEffect(() => {
    // Parse pathname: /study/domain-1/topic-2/section-3
    const match = pathname?.match(/^\/study\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);

    if (!match) return;

    const domainId = match[1];
    const topicId = match[2];

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
  }, [pathname, isStudyExpanded, expandedDomains, expandedTopics]);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_STUDY, JSON.stringify(isStudyExpanded));
    } catch {
      // Fail silently if localStorage is unavailable (e.g., private browsing)
    }
  }, [isStudyExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_DOMAINS, JSON.stringify([...expandedDomains]));
    } catch {
      // Fail silently if localStorage is unavailable (e.g., private browsing)
    }
  }, [expandedDomains]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify([...expandedTopics]));
    } catch {
      // Fail silently if localStorage is unavailable (e.g., private browsing)
    }
  }, [expandedTopics]);

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
