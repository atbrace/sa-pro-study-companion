import type { Domain, DomainMeta, Topic, TopicMeta, Question, TopicContent } from '@/types/domain';

export function createDomainMeta(overrides: Partial<DomainMeta> = {}): DomainMeta {
  return {
    id: 'domain-1-test',
    name: 'Test Domain',
    shortName: 'Test',
    weight: 25,
    description: 'A test domain',
    color: 'blue',
    icon: 'test',
    examTasks: [],
    topics: [],
    keyServices: [],
    awsDocLinks: [],
    ...overrides,
  };
}

export function createTopicMeta(overrides: Partial<TopicMeta> = {}): TopicMeta {
  return {
    id: 'topic-1',
    name: 'Test Topic',
    shortName: 'Test',
    examTask: 'task-1',
    description: 'A test topic',
    estimatedStudyTime: 30,
    difficulty: 'intermediate',
    keyServices: ['Amazon S3'],
    keyConcepts: ['storage'],
    awsDocLinks: [],
    relatedExperiments: [],
    ...overrides,
  };
}

export function createTopicContent(overrides: Partial<TopicContent> = {}): TopicContent {
  return {
    frontmatter: { title: 'Test Content', lastUpdated: '2025-01-01' },
    content: '# Test\n\nSome content',
    ...overrides,
  };
}

export function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    type: 'single',
    text: 'Test question',
    options: [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
    ],
    correctAnswer: 'A',
    explanation: 'Test explanation',
    services: [],
    concepts: [],
    ...overrides,
  };
}

export function createTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    meta: createTopicMeta(),
    content: createTopicContent(),
    questions: [createQuestion()],
    ...overrides,
  };
}

export function createDomain(overrides: Partial<Domain> = {}): Domain {
  return {
    meta: createDomainMeta(),
    overview: null,
    topics: [createTopic()],
    ...overrides,
  };
}
