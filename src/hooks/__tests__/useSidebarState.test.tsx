import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarState } from '../useSidebarState';

// jsdom in this environment provides a localStorage stub without real methods.
// We replace it entirely with an in-memory implementation for each test.
function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
    get _store() { return store; },
  };
}

let storageMock: ReturnType<typeof makeLocalStorageMock>;

beforeEach(() => {
  storageMock = makeLocalStorageMock();
  vi.stubGlobal('localStorage', storageMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Helper to pre-seed the mock before the hook renders
function seedLocalStorage(overrides: {
  study?: boolean;
  domains?: string[];
  topics?: string[];
} = {}) {
  if (overrides.study !== undefined) {
    storageMock._store['sidebar-expanded-study'] = JSON.stringify(overrides.study);
  }
  if (overrides.domains !== undefined) {
    storageMock._store['sidebar-expanded-domains'] = JSON.stringify(overrides.domains);
  }
  if (overrides.topics !== undefined) {
    storageMock._store['sidebar-expanded-topics'] = JSON.stringify(overrides.topics);
  }
}

describe('useSidebarState', () => {
  it('returns all-collapsed initial state before hydration', () => {
    const { result } = renderHook(() => useSidebarState('/'));

    // Synchronous snapshot — before effects run everything is collapsed
    expect(result.current.isStudyExpanded).toBe(false);
    expect(result.current.expandedDomains.size).toBe(0);
    expect(result.current.expandedTopics.size).toBe(0);
  });

  it('hydrates isStudyExpanded from localStorage after mount', async () => {
    seedLocalStorage({ study: true });

    const { result } = renderHook(() => useSidebarState('/'));

    // Allow the hydration useEffect to run
    await act(async () => {});

    expect(result.current.isStudyExpanded).toBe(true);
  });

  it('hydrates expandedDomains and expandedTopics from localStorage after mount', async () => {
    seedLocalStorage({
      domains: ['domain-1', 'domain-2'],
      topics: ['domain-1/topic-a', 'domain-2/topic-b'],
    });

    const { result } = renderHook(() => useSidebarState('/'));

    await act(async () => {});

    expect(result.current.expandedDomains).toEqual(new Set(['domain-1', 'domain-2']));
    expect(result.current.expandedTopics).toEqual(
      new Set(['domain-1/topic-a', 'domain-2/topic-b'])
    );
  });

  it('toggleStudy flips isStudyExpanded', async () => {
    const { result } = renderHook(() => useSidebarState('/'));

    await act(async () => {});

    expect(result.current.isStudyExpanded).toBe(false);

    act(() => result.current.toggleStudy());
    expect(result.current.isStudyExpanded).toBe(true);

    act(() => result.current.toggleStudy());
    expect(result.current.isStudyExpanded).toBe(false);
  });

  it('toggleDomain adds then removes a domain from expandedDomains', async () => {
    const { result } = renderHook(() => useSidebarState('/'));

    await act(async () => {});

    act(() => result.current.toggleDomain('domain-1'));
    expect(result.current.expandedDomains.has('domain-1')).toBe(true);

    act(() => result.current.toggleDomain('domain-1'));
    expect(result.current.expandedDomains.has('domain-1')).toBe(false);
  });

  it('toggleTopic adds then removes a composite key from expandedTopics', async () => {
    const { result } = renderHook(() => useSidebarState('/'));

    await act(async () => {});

    act(() => result.current.toggleTopic('domain-1', 'topic-2'));
    expect(result.current.expandedTopics.has('domain-1/topic-2')).toBe(true);

    act(() => result.current.toggleTopic('domain-1', 'topic-2'));
    expect(result.current.expandedTopics.has('domain-1/topic-2')).toBe(false);
  });

  it('auto-expands study, domain, and topic from a deep study pathname', async () => {
    const { result } = renderHook(() =>
      useSidebarState('/sap-c02/study/domain-1/topic-2/section-3')
    );

    await act(async () => {});

    expect(result.current.isStudyExpanded).toBe(true);
    expect(result.current.expandedDomains.has('domain-1')).toBe(true);
    expect(result.current.expandedTopics.has('domain-1/topic-2')).toBe(true);
  });

  it('does not auto-expand topic when pathname has no topic segment', async () => {
    const { result } = renderHook(() =>
      useSidebarState('/sap-c02/study/domain-3')
    );

    await act(async () => {});

    expect(result.current.isStudyExpanded).toBe(true);
    expect(result.current.expandedDomains.has('domain-3')).toBe(true);
    expect(result.current.expandedTopics.size).toBe(0);
  });

  it('persists state to localStorage after toggleStudy (post-hydration)', async () => {
    const { result } = renderHook(() => useSidebarState('/'));

    await act(async () => {});

    act(() => result.current.toggleStudy());

    expect(storageMock.setItem).toHaveBeenCalledWith(
      'sidebar-expanded-study',
      'true'
    );
  });

  it('persists toggleDomain result to localStorage', async () => {
    const { result } = renderHook(() => useSidebarState('/'));

    await act(async () => {});

    act(() => result.current.toggleDomain('domain-5'));

    const domainsCall = storageMock.setItem.mock.calls
      .filter(([key]: [string, string]) => key === 'sidebar-expanded-domains')
      .at(-1);
    expect(domainsCall).toBeDefined();
    const stored = JSON.parse(domainsCall![1]);
    expect(stored).toContain('domain-5');
  });

  it('does not crash when localStorage.getItem throws during hydration', async () => {
    storageMock.getItem.mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const { result } = renderHook(() => useSidebarState('/'));

    // Should not throw
    await act(async () => {});

    // State remains at defaults
    expect(result.current.isStudyExpanded).toBe(false);
    expect(result.current.expandedDomains.size).toBe(0);
    expect(result.current.expandedTopics.size).toBe(0);
  });
});
