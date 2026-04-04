import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDomainMeta, createTopicMeta, createQuestion } from '@/lib/test-helpers/factories';

// Mock exam-loader using the path alias that loader.ts actually uses
vi.mock('@/lib/content/exam-loader', () => ({
  getExamContentDir: vi.fn().mockReturnValue('/mock-content/domains'),
}));

vi.mock('fs');

import fs from 'fs';
import { getContentIssues, clearContentIssues } from '../logger';
import {
  getAllDomains,
  getDomainById,
  getTopicById,
  getTopicQuestions,
  getRandomDomainQuestions,
  getDomainQuestionCount,
  getContentStats,
  clearContentCache,
} from '../loader';

const mockFs = vi.mocked(fs);

beforeEach(() => {
  vi.clearAllMocks();
  clearContentCache();
  clearContentIssues();
});

describe('getAllDomains', () => {
  it('returns sorted domains when content directory exists', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s === '/mock-content/domains') return true;
      if (s.endsWith('domain-1-complexity') || s.endsWith('domain-2-design')) return true;
      if (s.endsWith('meta.yaml')) return true;
      if (s.endsWith('overview.md')) return false;
      if (s.endsWith('topics')) return false;
      return false;
    });

    mockFs.readdirSync.mockReturnValueOnce(
      ['domain-2-design', 'domain-1-complexity'] as unknown as ReturnType<typeof fs.readdirSync>
    );

    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);

    mockFs.readFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
      const s = p.toString();
      if (s.includes('domain-1-complexity')) {
        return 'id: domain-1-complexity\nname: Complexity\nshortName: Complexity\nweight: 26\ndescription: test\ncolor: blue\nicon: test\nexamTasks: []\ntopics: []\nkeyServices: []\nawsDocLinks: []' as unknown as ReturnType<typeof fs.readFileSync>;
      }
      return 'id: domain-2-design\nname: Design\nshortName: Design\nweight: 29\ndescription: test\ncolor: red\nicon: test\nexamTasks: []\ntopics: []\nkeyServices: []\nawsDocLinks: []' as unknown as ReturnType<typeof fs.readFileSync>;
    });

    const result = getAllDomains('sap-c02');
    expect(result).toHaveLength(2);
    expect(result[0].meta.id).toBe('domain-1-complexity');
    expect(result[1].meta.id).toBe('domain-2-design');
  });

  it('returns empty array when content directory missing', () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = getAllDomains('sap-c02');
    expect(result).toEqual([]);
  });

  it('filters non-directory entries and non-domain-prefixed dirs', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s === '/mock-content/domains') return true;
      // getDomainById will check for these paths - return false so they become null
      return false;
    });

    mockFs.readdirSync.mockReturnValueOnce(
      ['readme.md', 'some-folder', 'domain-1-test'] as unknown as ReturnType<typeof fs.readdirSync>
    );

    mockFs.statSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.includes('readme.md')) return { isDirectory: () => false } as fs.Stats;
      return { isDirectory: () => true } as fs.Stats;
    });

    const result = getAllDomains('sap-c02');
    // 'readme.md' not a directory, 'some-folder' doesn't start with 'domain-',
    // 'domain-1-test' passes filter but getDomainById returns null (existsSync false)
    expect(result).toEqual([]);
  });

  it('returns empty array for empty directory', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValueOnce([] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = getAllDomains('sap-c02');
    expect(result).toEqual([]);
  });
});

describe('getDomainById', () => {
  it('loads domain with meta, overview, and topics', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.includes('domain-1-test') && !s.endsWith('overview.md') && !s.endsWith('topics')) return true;
      if (s.endsWith('overview.md')) return true;
      if (s.endsWith('topics')) return false;
      return false;
    });

    mockFs.readFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
      const s = p.toString();
      if (s.endsWith('meta.yaml')) {
        return 'id: domain-1-test\nname: Test\nshortName: Test\nweight: 25\ndescription: desc\ncolor: blue\nicon: i\nexamTasks: []\ntopics: []\nkeyServices: []\nawsDocLinks: []' as unknown as ReturnType<typeof fs.readFileSync>;
      }
      if (s.endsWith('overview.md')) {
        return "---\ntitle: Overview\nlastUpdated: '2025-01-01'\n---\n# Overview content" as unknown as ReturnType<typeof fs.readFileSync>;
      }
      return '' as unknown as ReturnType<typeof fs.readFileSync>;
    });

    const result = getDomainById('sap-c02', 'domain-1-test');
    expect(result).not.toBeNull();
    expect(result!.meta.id).toBe('domain-1-test');
    expect(result!.overview).not.toBeNull();
    expect(result!.overview!.content).toContain('Overview content');
    expect(result!.topics).toEqual([]);
  });

  it('returns null when domain directory missing', () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = getDomainById('sap-c02', 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when meta.yaml missing', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      // Domain dir exists but meta.yaml doesn't
      if (s.endsWith('domain-1-test')) return true;
      if (s.endsWith('meta.yaml')) return false;
      return false;
    });

    const result = getDomainById('sap-c02', 'domain-1-test');
    expect(result).toBeNull();
  });

  it('returns domain with null overview when overview.md missing', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.endsWith('domain-1-test')) return true;
      if (s.endsWith('meta.yaml')) return true;
      if (s.endsWith('overview.md')) return false;
      if (s.endsWith('topics')) return false;
      return false;
    });

    mockFs.readFileSync.mockReturnValue(
      'id: domain-1-test\nname: Test\nshortName: Test\nweight: 25\ndescription: d\ncolor: c\nicon: i\nexamTasks: []\ntopics: []\nkeyServices: []\nawsDocLinks: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const result = getDomainById('sap-c02', 'domain-1-test');
    expect(result).not.toBeNull();
    expect(result!.overview).toBeNull();
  });
});

describe('getTopicById', () => {
  it('loads topic with meta, content, and questions', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      // Topic dir check (path ends with /topics/topic-1)
      if (s.includes('/topics/topic-1') && !s.endsWith('.yaml') && !s.endsWith('.md')) return true;
      if (s.endsWith('meta.yaml')) return true;
      if (s.endsWith('content.md')) return true;
      if (s.endsWith('questions.yaml')) return true;
      return false;
    });

    mockFs.readFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
      const s = p.toString();
      if (s.endsWith('meta.yaml')) {
        return 'id: topic-1\nname: Topic One\nshortName: T1\nexamTask: task-1\ndescription: d\nestimatedStudyTime: 30\ndifficulty: intermediate\nkeyServices: []\nkeyConcepts: []\nawsDocLinks: []\nrelatedExperiments: []' as unknown as ReturnType<typeof fs.readFileSync>;
      }
      if (s.endsWith('content.md')) {
        return "---\ntitle: Topic One\nlastUpdated: '2025-01-01'\n---\n# Topic content" as unknown as ReturnType<typeof fs.readFileSync>;
      }
      if (s.endsWith('questions.yaml')) {
        return 'questions:\n  - id: q1\n    type: single\n    text: Test?\n    options:\n      - id: A\n        text: Opt A\n      - id: B\n        text: Opt B\n    correctAnswer: A\n    explanation: Because A\n    services: []\n    concepts: []' as unknown as ReturnType<typeof fs.readFileSync>;
      }
      return '' as unknown as ReturnType<typeof fs.readFileSync>;
    });

    const result = getTopicById('sap-c02', 'domain-1', 'topic-1');
    expect(result).not.toBeNull();
    expect(result!.meta.id).toBe('topic-1');
    expect(result!.content).not.toBeNull();
    expect(result!.content!.content).toContain('Topic content');
    expect(result!.questions).toHaveLength(1);
    expect(result!.questions[0].domainId).toBe('domain-1');
    expect(result!.questions[0].topicId).toBe('topic-1');
  });

  it('returns null when topic directory missing', () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = getTopicById('sap-c02', 'domain-1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when meta.yaml missing', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      // Topic dir exists
      if (s.includes('/topics/topic-1') && !s.endsWith('.yaml') && !s.endsWith('.md')) return true;
      // meta.yaml doesn't
      if (s.endsWith('meta.yaml')) return false;
      return false;
    });

    const result = getTopicById('sap-c02', 'domain-1', 'topic-1');
    expect(result).toBeNull();
  });

  it('loads topic with null content when content.md missing', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.includes('/topics/topic-1') && !s.endsWith('.yaml') && !s.endsWith('.md')) return true;
      if (s.endsWith('meta.yaml')) return true;
      if (s.endsWith('content.md')) return false;
      if (s.endsWith('questions.yaml')) return false;
      return false;
    });

    mockFs.readFileSync.mockReturnValue(
      'id: topic-1\nname: T\nshortName: T\nexamTask: t\ndescription: d\nestimatedStudyTime: 30\ndifficulty: intermediate\nkeyServices: []\nkeyConcepts: []\nawsDocLinks: []\nrelatedExperiments: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const result = getTopicById('sap-c02', 'domain-1', 'topic-1');
    expect(result).not.toBeNull();
    expect(result!.content).toBeNull();
  });
});

describe('getTopicQuestions', () => {
  it('loads and parses questions.yaml', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      'questions:\n  - id: q1\n    type: single\n    text: Q?\n    options:\n      - id: A\n        text: A\n    correctAnswer: A\n    explanation: E\n    services: [S3]\n    concepts: [storage]' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const result = getTopicQuestions('sap-c02', 'domain-1', 'topic-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('q1');
  });

  it('injects domainId and topicId into each question', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      'questions:\n  - id: q1\n    type: single\n    text: Q?\n    options: []\n    correctAnswer: A\n    explanation: E\n    services: []\n    concepts: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const result = getTopicQuestions('sap-c02', 'my-domain', 'my-topic');
    expect(result[0].domainId).toBe('my-domain');
    expect(result[0].topicId).toBe('my-topic');
  });

  it('returns empty array when questions.yaml missing', () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = getTopicQuestions('sap-c02', 'domain-1', 'topic-1');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty questions list', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      'questions: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const result = getTopicQuestions('sap-c02', 'domain-1', 'topic-1');
    expect(result).toEqual([]);
  });
});

describe('getRandomDomainQuestions', () => {
  it('returns at most count questions', () => {
    mockFs.existsSync.mockReturnValue(true);

    mockFs.readdirSync.mockReturnValueOnce(
      ['topic-1', 'topic-2'] as unknown as ReturnType<typeof fs.readdirSync>
    );
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);

    let metaCount = 0;
    mockFs.readFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
      const s = p.toString();
      if (s.endsWith('meta.yaml')) {
        metaCount++;
        return `id: topic-${metaCount}\nname: T${metaCount}\nshortName: T\nexamTask: t\ndescription: d\nestimatedStudyTime: 30\ndifficulty: intermediate\nkeyServices: []\nkeyConcepts: []\nawsDocLinks: []\nrelatedExperiments: []` as unknown as ReturnType<typeof fs.readFileSync>;
      }
      if (s.endsWith('questions.yaml')) {
        return 'questions:\n  - id: q-a\n    type: single\n    text: Q?\n    options: []\n    correctAnswer: A\n    explanation: E\n    services: []\n    concepts: []\n  - id: q-b\n    type: single\n    text: Q2?\n    options: []\n    correctAnswer: B\n    explanation: E2\n    services: []\n    concepts: []' as unknown as ReturnType<typeof fs.readFileSync>;
      }
      return '' as unknown as ReturnType<typeof fs.readFileSync>;
    });

    const result = getRandomDomainQuestions('sap-c02', 'domain-1', 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array for domain with no topics', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s === '/mock-content/domains') return true;
      if (s.endsWith('topics')) return false;
      return true;
    });

    const result = getRandomDomainQuestions('sap-c02', 'domain-1', 5);
    expect(result).toEqual([]);
  });
});

describe('getDomainQuestionCount', () => {
  it('sums questions across all topics', () => {
    const domain = {
      meta: createDomainMeta(),
      overview: null,
      topics: [
        { meta: createTopicMeta(), content: null, questions: [createQuestion({ id: 'q1' }), createQuestion({ id: 'q2' })] },
        { meta: createTopicMeta({ id: 'topic-2' }), content: null, questions: [createQuestion({ id: 'q3' })] },
      ],
    };

    expect(getDomainQuestionCount(domain)).toBe(3);
  });

  it('returns 0 for domain with no topics', () => {
    const domain = {
      meta: createDomainMeta(),
      overview: null,
      topics: [],
    };

    expect(getDomainQuestionCount(domain)).toBe(0);
  });
});

describe('getContentStats', () => {
  it('returns complete statistics object', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s === '/mock-content/domains') return true;
      if (s.endsWith('domain-1-test')) return true;
      if (s.endsWith('meta.yaml')) return true;
      if (s.endsWith('overview.md')) return false;
      if (s.endsWith('topics')) return false;
      return false;
    });

    mockFs.readdirSync.mockReturnValueOnce(
      ['domain-1-test'] as unknown as ReturnType<typeof fs.readdirSync>
    );

    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);

    mockFs.readFileSync.mockReturnValue(
      'id: domain-1-test\nname: Test\nshortName: Test\nweight: 25\ndescription: d\ncolor: c\nicon: i\nexamTasks: []\ntopics: []\nkeyServices: []\nawsDocLinks: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const stats = getContentStats('sap-c02');
    expect(stats.totalDomains).toBe(1);
    expect(stats.totalTopics).toBe(0);
    expect(stats.totalQuestions).toBe(0);
    expect(stats.domains).toHaveLength(1);
    expect(stats.domains[0].id).toBe('domain-1-test');
  });

  it('returns zeros for exam with no domains', () => {
    mockFs.existsSync.mockReturnValue(false);

    const stats = getContentStats('sap-c02');
    expect(stats.totalDomains).toBe(0);
    expect(stats.totalTopics).toBe(0);
    expect(stats.totalQuestions).toBe(0);
    expect(stats.domains).toEqual([]);
  });
});

describe('content caching', () => {
  it('getAllDomains returns cached result on second call without re-reading fs', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s === '/mock-content/domains') return true;
      if (s.endsWith('domain-1-test')) return true;
      if (s.endsWith('meta.yaml')) return true;
      if (s.endsWith('overview.md')) return false;
      if (s.endsWith('topics')) return false;
      return false;
    });

    mockFs.readdirSync.mockReturnValue(
      ['domain-1-test'] as unknown as ReturnType<typeof fs.readdirSync>
    );
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
    mockFs.readFileSync.mockReturnValue(
      'id: domain-1-test\nname: Test\nshortName: Test\nweight: 25\ndescription: d\ncolor: c\nicon: i\nexamTasks: []\ntopics: []\nkeyServices: []\nawsDocLinks: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const first = getAllDomains('sap-c02');
    const readCallsAfterFirst = mockFs.readFileSync.mock.calls.length;

    const second = getAllDomains('sap-c02');
    const readCallsAfterSecond = mockFs.readFileSync.mock.calls.length;

    expect(first).toEqual(second);
    expect(readCallsAfterSecond).toBe(readCallsAfterFirst);
  });

  it('getDomainById returns cached result on second call without re-reading fs', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.endsWith('domain-1-test')) return true;
      if (s.endsWith('meta.yaml')) return true;
      if (s.endsWith('overview.md')) return false;
      if (s.endsWith('topics')) return false;
      return false;
    });

    mockFs.readFileSync.mockReturnValue(
      'id: domain-1-test\nname: Test\nshortName: Test\nweight: 25\ndescription: d\ncolor: c\nicon: i\nexamTasks: []\ntopics: []\nkeyServices: []\nawsDocLinks: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const first = getDomainById('sap-c02', 'domain-1-test');
    const readCallsAfterFirst = mockFs.readFileSync.mock.calls.length;

    const second = getDomainById('sap-c02', 'domain-1-test');
    const readCallsAfterSecond = mockFs.readFileSync.mock.calls.length;

    expect(first).toEqual(second);
    expect(readCallsAfterSecond).toBe(readCallsAfterFirst);
  });

  it('getTopicQuestions returns cached result on second call without re-reading fs', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      'questions:\n  - id: q1\n    type: single\n    text: Q?\n    options: []\n    correctAnswer: A\n    explanation: E\n    services: []\n    concepts: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const first = getTopicQuestions('sap-c02', 'domain-1', 'topic-1');
    const readCallsAfterFirst = mockFs.readFileSync.mock.calls.length;

    const second = getTopicQuestions('sap-c02', 'domain-1', 'topic-1');
    const readCallsAfterSecond = mockFs.readFileSync.mock.calls.length;

    expect(first).toEqual(second);
    expect(readCallsAfterSecond).toBe(readCallsAfterFirst);
  });

  it('clearContentCache causes next call to re-read from fs', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      'questions:\n  - id: q1\n    type: single\n    text: Q?\n    options: []\n    correctAnswer: A\n    explanation: E\n    services: []\n    concepts: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    getTopicQuestions('sap-c02', 'domain-1', 'topic-1');
    const readCallsAfterFirst = mockFs.readFileSync.mock.calls.length;

    clearContentCache();

    getTopicQuestions('sap-c02', 'domain-1', 'topic-1');
    const readCallsAfterClear = mockFs.readFileSync.mock.calls.length;

    expect(readCallsAfterClear).toBeGreaterThan(readCallsAfterFirst);
  });

  it('caches are isolated by examId', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      'questions:\n  - id: q1\n    type: single\n    text: Q?\n    options: []\n    correctAnswer: A\n    explanation: E\n    services: []\n    concepts: []' as unknown as ReturnType<typeof fs.readFileSync>
    );

    getTopicQuestions('sap-c02', 'domain-1', 'topic-1');
    const callsAfterFirst = mockFs.readFileSync.mock.calls.length;

    // Different examId should trigger a new read
    getTopicQuestions('mla-c01', 'domain-1', 'topic-1');
    const callsAfterSecond = mockFs.readFileSync.mock.calls.length;

    expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);
  });
});

describe('structured logging for content issues', () => {
  it('logs missing content directory as warn with reason=missing', () => {
    mockFs.existsSync.mockReturnValue(false);

    getAllDomains('sap-c02');

    const issues = getContentIssues();
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const dirIssue = issues.find(i => i.reason === 'missing' && i.filePath.includes('domains'));
    expect(dirIssue).toBeDefined();
    expect(dirIssue!.level).toBe('warn');
  });

  it('logs missing domain meta.yaml as warn with reason=missing', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.endsWith('domain-1-test')) return true;
      if (s.endsWith('meta.yaml')) return false;
      return false;
    });

    getDomainById('sap-c02', 'domain-1-test');

    const issues = getContentIssues();
    const metaIssue = issues.find(i => i.reason === 'missing' && i.filePath.includes('meta.yaml'));
    expect(metaIssue).toBeDefined();
    expect(metaIssue!.level).toBe('warn');
  });

  it('logs malformed domain meta.yaml as error with reason=malformed', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.endsWith('domain-1-test')) return true;
      if (s.endsWith('meta.yaml')) return true;
      return false;
    });
    mockFs.readFileSync.mockReturnValue(
      '{{ invalid yaml: [broken' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const result = getDomainById('sap-c02', 'domain-1-test');

    expect(result).toBeNull();
    const issues = getContentIssues();
    const malformedIssue = issues.find(i => i.reason === 'malformed');
    expect(malformedIssue).toBeDefined();
    expect(malformedIssue!.level).toBe('error');
    expect(malformedIssue!.filePath).toContain('meta.yaml');
  });

  it('logs malformed questions.yaml as error and returns empty array', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      '{{ broken: yaml [[' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const result = getTopicQuestions('sap-c02', 'domain-1', 'topic-1');

    expect(result).toEqual([]);
    const issues = getContentIssues();
    const malformedIssue = issues.find(i => i.reason === 'malformed' && i.filePath.includes('questions.yaml'));
    expect(malformedIssue).toBeDefined();
    expect(malformedIssue!.level).toBe('error');
    expect(malformedIssue!.context?.domainId).toBe('domain-1');
    expect(malformedIssue!.context?.topicId).toBe('topic-1');
  });

  it('logs malformed topic meta.yaml as error and returns null', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.endsWith('topic-1')) return true;
      if (s.endsWith('meta.yaml')) return true;
      return false;
    });
    mockFs.readFileSync.mockReturnValue(
      '{{ invalid yaml' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const result = getTopicById('sap-c02', 'domain-1', 'topic-1');

    expect(result).toBeNull();
    const issues = getContentIssues();
    const malformedIssue = issues.find(i => i.reason === 'malformed');
    expect(malformedIssue).toBeDefined();
    expect(malformedIssue!.level).toBe('error');
  });
});
