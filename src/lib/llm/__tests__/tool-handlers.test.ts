import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStatement = vi.hoisted(() => ({
  all: vi.fn().mockReturnValue([]),
  get: vi.fn().mockReturnValue(undefined),
}));

// Mock dependencies before imports
vi.mock('@/lib/progress/tutor-context', () => ({
  getTutorProgressContext: vi.fn().mockReturnValue('## Progress\nOverall: 75%'),
}));

vi.mock('@/lib/content/loader', () => ({
  getAllDomains: vi.fn().mockReturnValue([]),
  getTopicById: vi.fn().mockReturnValue(null),
  getTopicQuestions: vi.fn().mockReturnValue([]),
}));

vi.mock('@/lib/content/experiments', () => ({
  getLabMeta: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    prepare: vi.fn().mockReturnValue(mockStatement),
  },
}));

import {
  handleGetStudyProgress,
  handleGetQuestionDetails,
  handleSearchStudyContent,
  handleGetTopicMetadata,
  handleGetAssessmentHistory,
  handleGetWeakAreaQuestions,
  handleSuggestNextStudyTopic,
} from '../tool-handlers';
import { getAllDomains, getTopicById, getTopicQuestions } from '@/lib/content/loader';
import { getLabMeta } from '@/lib/content/experiments';
import { db } from '@/lib/db/client';

beforeEach(() => {
  vi.clearAllMocks();
  mockStatement.all.mockReturnValue([]);
  mockStatement.get.mockReturnValue(undefined);
});

describe('handleGetStudyProgress', () => {
  it('returns progress context string', () => {
    const result = handleGetStudyProgress({}, 'sap-c02');
    expect(result).toContain('Progress');
    expect(result).toContain('75%');
  });
});

describe('handleGetQuestionDetails', () => {
  const mockQuestion = {
    id: 'net-001',
    type: 'single' as const,
    text: 'Which service provides VPC peering?',
    options: [
      { id: 'A', text: 'AWS Direct Connect' },
      { id: 'B', text: 'VPC Peering' },
      { id: 'C', text: 'AWS Transit Gateway' },
      { id: 'D', text: 'AWS VPN' },
    ],
    correctAnswer: 'B',
    explanation: 'VPC Peering allows direct connectivity between two VPCs.',
    awsDocLink: 'https://docs.aws.amazon.com/vpc/latest/peering/',
    services: ['Amazon VPC'],
    concepts: ['networking'],
    domainId: 'domain-1-organizational-complexity',
    topicId: 'network-connectivity',
  };

  it('returns question details when found by questionId with domainId and topicId', () => {
    vi.mocked(getTopicQuestions).mockReturnValue([mockQuestion]);

    const result = handleGetQuestionDetails(
      { questionId: 'net-001', domainId: 'domain-1-organizational-complexity', topicId: 'network-connectivity' },
      'sap-c02'
    );

    expect(result).toContain('net-001');
    expect(result).toContain('Which service provides VPC peering?');
    expect(result).toContain('VPC Peering');
    expect(result).toContain('**Correct Answer:** B');
    expect(result).toContain('VPC Peering allows direct connectivity');
    expect(result).toContain('https://docs.aws.amazon.com/vpc/latest/peering/');
  });

  it('searches all domains when domainId not provided', () => {
    vi.mocked(getAllDomains).mockReturnValue([
      {
        meta: { id: 'domain-1-organizational-complexity', name: 'D1', shortName: 'D1', weight: 26, description: '', color: '', icon: '', examTasks: [], topics: ['network-connectivity'], keyServices: [], awsDocLinks: [] },
        overview: null,
        topics: [{ meta: { id: 'network-connectivity', name: 'Net', shortName: 'Net', examTask: '', description: '', estimatedStudyTime: 30, difficulty: 'intermediate', keyServices: [], keyConcepts: [], awsDocLinks: [], relatedExperiments: [] }, content: null, questions: [mockQuestion] }],
      },
    ]);

    const result = handleGetQuestionDetails({ questionId: 'net-001' }, 'sap-c02');
    expect(result).toContain('net-001');
    expect(result).toContain('**Correct Answer:** B');
  });

  it('returns not found message for invalid questionId', () => {
    vi.mocked(getTopicQuestions).mockReturnValue([]);
    vi.mocked(getAllDomains).mockReturnValue([]);

    const result = handleGetQuestionDetails({ questionId: 'nonexistent-999' }, 'sap-c02');
    expect(result).toContain('not found');
  });

  it('handles multi-select questions', () => {
    const multiQuestion = {
      ...mockQuestion,
      id: 'net-002',
      type: 'multi' as const,
      correctCount: 2,
      correctAnswer: ['A', 'C'],
    };
    vi.mocked(getTopicQuestions).mockReturnValue([multiQuestion]);

    const result = handleGetQuestionDetails(
      { questionId: 'net-002', domainId: 'domain-1-organizational-complexity', topicId: 'network-connectivity' },
      'sap-c02'
    );

    expect(result).toContain('net-002');
    expect(result).toContain('Select 2');
    expect(result).toContain('A, C');
  });
});

describe('handleSearchStudyContent', () => {
  const mockDomains = [
    {
      meta: { id: 'domain-1-organizational-complexity', name: 'Organizational Complexity', shortName: 'D1', weight: 26, description: 'Designing complex architectures', color: 'blue', icon: 'building', examTasks: [], topics: ['network-connectivity'], keyServices: [], awsDocLinks: [] },
      overview: null,
      topics: [
        {
          meta: {
            id: 'network-connectivity',
            name: 'Network Connectivity Strategies',
            shortName: 'Networking',
            examTask: 'task-1',
            description: 'Multi-VPC and hybrid connectivity',
            estimatedStudyTime: 60,
            difficulty: 'advanced' as const,
            keyServices: ['Amazon VPC', 'AWS Transit Gateway', 'AWS Direct Connect'],
            keyConcepts: ['VPC peering', 'transit gateway', 'hybrid connectivity'],
            awsDocLinks: [],
            relatedExperiments: [],
          },
          content: null,
          questions: [],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.mocked(getAllDomains).mockReturnValue(mockDomains);
  });

  it('finds topic by service name', () => {
    const result = handleSearchStudyContent({ query: 'Transit Gateway' }, 'sap-c02');
    expect(result).toContain('Network Connectivity');
    expect(result).toContain('network-connectivity');
  });

  it('finds topic by concept name', () => {
    const result = handleSearchStudyContent({ query: 'VPC peering' }, 'sap-c02');
    expect(result).toContain('Network Connectivity');
  });

  it('finds topic by name', () => {
    const result = handleSearchStudyContent({ query: 'network' }, 'sap-c02');
    expect(result).toContain('Network Connectivity');
  });

  it('finds topic by description keyword', () => {
    const result = handleSearchStudyContent({ query: 'hybrid' }, 'sap-c02');
    expect(result).toContain('Network Connectivity');
  });

  it('is case-insensitive', () => {
    const result = handleSearchStudyContent({ query: 'TRANSIT GATEWAY' }, 'sap-c02');
    expect(result).toContain('Network Connectivity');
  });

  it('returns no results message when nothing matches', () => {
    const result = handleSearchStudyContent({ query: 'blockchain' }, 'sap-c02');
    expect(result).toContain('No matching topics found');
  });

  it('includes route path in results', () => {
    const result = handleSearchStudyContent({ query: 'Transit Gateway' }, 'sap-c02');
    expect(result).toContain('/sap-c02/study/domain-1-organizational-complexity/network-connectivity');
  });
});

describe('handleGetTopicMetadata', () => {
  it('returns formatted topic metadata', () => {
    vi.mocked(getTopicById).mockReturnValue({
      meta: {
        id: 'network-connectivity',
        name: 'Network Connectivity Strategies',
        shortName: 'Networking',
        examTask: 'task-1',
        description: 'Multi-VPC and hybrid connectivity',
        estimatedStudyTime: 60,
        difficulty: 'advanced',
        keyServices: ['Amazon VPC', 'AWS Transit Gateway'],
        keyConcepts: ['VPC peering', 'transit gateway'],
        awsDocLinks: [{ title: 'VPC Docs', url: 'https://docs.aws.amazon.com/vpc/', type: 'doc' }],
        relatedExperiments: ['lab-vpc-networking'],
      },
      content: null,
      questions: [],
    });
    vi.mocked(getLabMeta).mockReturnValue({
      id: 'lab-vpc-networking',
      name: 'VPC Networking with Peering',
      stackFile: 'lab-vpc-networking.ts',
      stackClass: 'VpcNetworkingLabStack',
      estimatedCost: '~$0.10/hour',
      estimatedTime: 45,
    });

    const result = handleGetTopicMetadata(
      { domainId: 'domain-1-organizational-complexity', topicId: 'network-connectivity' },
      'sap-c02'
    );

    expect(result).toContain('Network Connectivity Strategies');
    expect(result).toContain('advanced');
    expect(result).toContain('60 min');
    expect(result).toContain('VPC peering');
    expect(result).toContain('AWS Transit Gateway');
    expect(result).toContain('VPC Docs');
    expect(result).toContain('VPC Networking with Peering');
  });

  it('returns not found for invalid topic', () => {
    vi.mocked(getTopicById).mockReturnValue(null);

    const result = handleGetTopicMetadata(
      { domainId: 'domain-1-organizational-complexity', topicId: 'nonexistent' },
      'sap-c02'
    );

    expect(result).toContain('not found');
  });

  it('handles topic with no related experiments', () => {
    vi.mocked(getTopicById).mockReturnValue({
      meta: {
        id: 'security-controls',
        name: 'Security Controls',
        shortName: 'Security',
        examTask: 'task-2',
        description: 'Security stuff',
        estimatedStudyTime: 45,
        difficulty: 'intermediate',
        keyServices: ['AWS IAM'],
        keyConcepts: ['least privilege'],
        awsDocLinks: [],
        relatedExperiments: [],
      },
      content: null,
      questions: [],
    });

    const result = handleGetTopicMetadata(
      { domainId: 'domain-1-organizational-complexity', topicId: 'security-controls' },
      'sap-c02'
    );

    expect(result).toContain('Security Controls');
    expect(result).not.toContain('Related Labs');
  });
});

describe('handleGetAssessmentHistory', () => {
  it('returns formatted assessment sessions', () => {
    vi.mocked(db.prepare).mockImplementation((sql: string) => {
      if (sql.includes('assessment_sessions')) {
        return {
          all: vi.fn().mockReturnValue([
            {
              id: 1,
              domain_id: 'domain-1-organizational-complexity',
              session_type: 'domain',
              total_questions: 15,
              correct_answers: 12,
              score_percentage: 80.0,
              completed_at: '2026-02-04T10:00:00Z',
            },
          ]),
          get: vi.fn(),
        } as any;
      }
      if (sql.includes('question_attempts') && sql.includes('is_correct = 0')) {
        return {
          all: vi.fn().mockReturnValue([
            { question_id: 'net-003', domain_id: 'domain-1-organizational-complexity', topic_id: 'network-connectivity' },
            { question_id: 'net-007', domain_id: 'domain-1-organizational-complexity', topic_id: 'network-connectivity' },
          ]),
          get: vi.fn(),
        } as any;
      }
      return { all: vi.fn().mockReturnValue([]), get: vi.fn() } as any;
    });

    const result = handleGetAssessmentHistory({}, 'sap-c02');

    expect(result).toContain('80');
    expect(result).toContain('15');
    expect(result).toContain('12');
    expect(result).toContain('net-003');
    expect(result).toContain('net-007');
  });

  it('returns no history message when empty', () => {
    vi.mocked(db.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn(),
    } as any);

    const result = handleGetAssessmentHistory({}, 'sap-c02');
    expect(result).toContain('No assessment history found');
  });

  it('respects limit parameter', () => {
    vi.mocked(db.prepare).mockImplementation((sql: string) => {
      if (sql.includes('assessment_sessions')) {
        return {
          all: vi.fn().mockImplementation((...args: unknown[]) => {
            // Verify the limit arg is passed
            const limitArg = args[args.length - 1];
            expect(limitArg).toBe(1);
            return [];
          }),
          get: vi.fn(),
        } as any;
      }
      return { all: vi.fn().mockReturnValue([]), get: vi.fn() } as any;
    });

    handleGetAssessmentHistory({ limit: 1 }, 'sap-c02');
  });

  it('filters by domainId when provided', () => {
    vi.mocked(db.prepare).mockImplementation((sql: string) => {
      if (sql.includes('assessment_sessions') && sql.includes('domain_id')) {
        return {
          all: vi.fn().mockReturnValue([]),
          get: vi.fn(),
        } as any;
      }
      return { all: vi.fn().mockReturnValue([]), get: vi.fn() } as any;
    });

    const result = handleGetAssessmentHistory({ domainId: 'domain-1-organizational-complexity' }, 'sap-c02');
    expect(result).toContain('No assessment history found');
  });
});

describe('handleGetWeakAreaQuestions', () => {
  it('returns questions sorted by miss rate', () => {
    vi.mocked(db.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([
        { question_id: 'net-003', topic_id: 'network-connectivity', times_attempted: 5, times_missed: 4 },
        { question_id: 'sec-001', topic_id: 'security-controls', times_attempted: 3, times_missed: 1 },
      ]),
      get: vi.fn(),
    } as any);

    const result = handleGetWeakAreaQuestions({}, 'sap-c02');

    expect(result).toContain('net-003');
    expect(result).toContain('80%'); // 4/5
    expect(result).toContain('sec-001');
    expect(result).toContain('33%'); // 1/3
    // net-003 should appear before sec-001 (higher miss rate)
    expect(result.indexOf('net-003')).toBeLessThan(result.indexOf('sec-001'));
  });

  it('returns no incorrect attempts message when empty', () => {
    vi.mocked(db.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn(),
    } as any);

    const result = handleGetWeakAreaQuestions({}, 'sap-c02');
    expect(result).toContain('No incorrect attempts found');
  });

  it('respects limit parameter', () => {
    vi.mocked(db.prepare).mockReturnValue({
      all: vi.fn().mockImplementation((...args: unknown[]) => {
        const limitArg = args[args.length - 1];
        expect(limitArg).toBe(5);
        return [];
      }),
      get: vi.fn(),
    } as any);

    handleGetWeakAreaQuestions({ limit: 5 }, 'sap-c02');
  });
});

describe('handleSuggestNextStudyTopic', () => {
  const makeDomains = () => [
    {
      meta: { id: 'domain-1', name: 'Domain 1', shortName: 'D1', weight: 30, description: '', color: '', icon: '', examTasks: [], topics: ['topic-a', 'topic-b'], keyServices: [], awsDocLinks: [] },
      overview: null,
      topics: [
        { meta: { id: 'topic-a', name: 'Topic A', shortName: 'A', examTask: '', description: '', estimatedStudyTime: 30, difficulty: 'beginner' as const, keyServices: [], keyConcepts: [], awsDocLinks: [], relatedExperiments: [] }, content: null, questions: [] },
        { meta: { id: 'topic-b', name: 'Topic B', shortName: 'B', examTask: '', description: '', estimatedStudyTime: 45, difficulty: 'advanced' as const, keyServices: [], keyConcepts: [], awsDocLinks: [], relatedExperiments: [] }, content: null, questions: [] },
      ],
    },
    {
      meta: { id: 'domain-2', name: 'Domain 2', shortName: 'D2', weight: 20, description: '', color: '', icon: '', examTasks: [], topics: ['topic-c'], keyServices: [], awsDocLinks: [] },
      overview: null,
      topics: [
        { meta: { id: 'topic-c', name: 'Topic C', shortName: 'C', examTask: '', description: '', estimatedStudyTime: 60, difficulty: 'intermediate' as const, keyServices: [], keyConcepts: [], awsDocLinks: [], relatedExperiments: [] }, content: null, questions: [] },
      ],
    },
  ];

  it('prioritizes never-studied topics', () => {
    vi.mocked(getAllDomains).mockReturnValue(makeDomains());
    // No topic_progress at all = all topics never studied
    vi.mocked(db.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const result = handleSuggestNextStudyTopic({}, 'sap-c02');

    // Should recommend topics, preferring higher-weight domain
    expect(result).toContain('Topic A');
    expect(result).toContain('Never studied');
  });

  it('prioritizes weak areas over low-mastery topics', () => {
    vi.mocked(getAllDomains).mockReturnValue(makeDomains());

    vi.mocked(db.prepare).mockImplementation((sql: string) => {
      if (sql.includes('topic_progress')) {
        return {
          all: vi.fn().mockReturnValue([
            { domain_id: 'domain-1', topic_id: 'topic-a', mastery_level: 0.3, questions_attempted: 10, last_studied_at: '2026-02-04' },
            { domain_id: 'domain-1', topic_id: 'topic-b', mastery_level: 0.5, questions_attempted: 5, last_studied_at: '2026-02-04' },
            { domain_id: 'domain-2', topic_id: 'topic-c', mastery_level: 0.4, questions_attempted: 8, last_studied_at: '2026-02-04' },
          ]),
          get: vi.fn(),
        } as any;
      }
      if (sql.includes('weak_areas')) {
        return {
          all: vi.fn().mockReturnValue([
            { domain_id: 'domain-1', topic_id: 'topic-a' },
          ]),
          get: vi.fn(),
        } as any;
      }
      return { all: vi.fn().mockReturnValue([]), get: vi.fn() } as any;
    });

    const result = handleSuggestNextStudyTopic({}, 'sap-c02');

    // topic-a should be first (weak area + low mastery)
    expect(result).toContain('Topic A');
    expect(result.indexOf('Topic A')).toBeLessThan(result.indexOf('Topic B'));
  });

  it('returns all mastered message when everything above 85%', () => {
    vi.mocked(getAllDomains).mockReturnValue(makeDomains());

    vi.mocked(db.prepare).mockImplementation((sql: string) => {
      if (sql.includes('topic_progress')) {
        return {
          all: vi.fn().mockReturnValue([
            { domain_id: 'domain-1', topic_id: 'topic-a', mastery_level: 0.9, questions_attempted: 20, last_studied_at: '2026-02-04' },
            { domain_id: 'domain-1', topic_id: 'topic-b', mastery_level: 0.88, questions_attempted: 15, last_studied_at: '2026-02-04' },
            { domain_id: 'domain-2', topic_id: 'topic-c', mastery_level: 0.92, questions_attempted: 18, last_studied_at: '2026-02-04' },
          ]),
          get: vi.fn(),
        } as any;
      }
      if (sql.includes('weak_areas')) {
        return { all: vi.fn().mockReturnValue([]), get: vi.fn() } as any;
      }
      return { all: vi.fn().mockReturnValue([]), get: vi.fn() } as any;
    });

    const result = handleSuggestNextStudyTopic({}, 'sap-c02');
    expect(result).toContain('All topics mastered');
  });

  it('returns top 3 recommendations', () => {
    vi.mocked(getAllDomains).mockReturnValue(makeDomains());
    vi.mocked(db.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const result = handleSuggestNextStudyTopic({}, 'sap-c02');

    // Should have exactly 3 topics (all never studied, 3 total)
    expect(result).toContain('Topic A');
    expect(result).toContain('Topic B');
    expect(result).toContain('Topic C');
  });
});
