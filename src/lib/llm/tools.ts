import type { LLMTool } from './types';

/**
 * Tools available to the tutor for fetching dynamic data
 */
export const TUTOR_TOOLS: LLMTool[] = [
  {
    name: 'get_study_progress',
    description:
      "Get the student's current study progress including mastery scores, weak areas, and exam readiness. " +
      'Call this when the user asks about their progress, what to study next, how they are doing, ' +
      'their weak areas, or whether they are ready for the exam.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_question_details',
    description:
      'Get full details for a specific question including the correct answer, explanation, and AWS documentation link. ' +
      'Call this when the user asks why an answer is correct/incorrect, wants an explanation for a question, ' +
      'or asks about a specific question they encountered.',
    parameters: {
      type: 'object',
      properties: {
        questionId: {
          type: 'string',
          description: 'The question ID (e.g. "net-001")',
        },
        domainId: {
          type: 'string',
          description: 'Optional domain ID to narrow the search',
        },
        topicId: {
          type: 'string',
          description: 'Optional topic ID to narrow the search further',
        },
      },
      required: ['questionId'],
    },
  },
  {
    name: 'search_study_content',
    description:
      'Search study topics by keyword to find relevant content. Matches against topic names, key concepts, ' +
      'key services, and descriptions. Call this when the user asks where to learn about a specific AWS service, ' +
      'concept, or topic.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keywords (e.g. "Transit Gateway", "IAM policies", "serverless")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_topic_metadata',
    description:
      'Get detailed metadata for a study topic including difficulty, estimated study time, key concepts, ' +
      'AWS doc links, and related hands-on labs. Call this when the user asks about topic difficulty, ' +
      'what a topic covers, or what labs are available.',
    parameters: {
      type: 'object',
      properties: {
        domainId: {
          type: 'string',
          description: 'The domain ID (e.g. "domain-1-organizational-complexity")',
        },
        topicId: {
          type: 'string',
          description: 'The topic ID (e.g. "network-connectivity")',
        },
      },
      required: ['domainId', 'topicId'],
    },
  },
  {
    name: 'get_assessment_history',
    description:
      'Get recent assessment session results including scores and missed questions. ' +
      'Call this when the user asks how they did on assessments, what questions they missed, ' +
      'or wants to review past performance.',
    parameters: {
      type: 'object',
      properties: {
        domainId: {
          type: 'string',
          description: 'Optional domain ID to filter results',
        },
        limit: {
          type: 'number',
          description: 'Number of recent sessions to return (default 3)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_weak_area_questions',
    description:
      'Get questions the student has frequently answered incorrectly, sorted by miss rate. ' +
      'Call this when the user asks to practice weak areas, review mistakes, or wants to see ' +
      'which questions they struggle with most.',
    parameters: {
      type: 'object',
      properties: {
        domainId: {
          type: 'string',
          description: 'Optional domain ID to filter by domain',
        },
        topicId: {
          type: 'string',
          description: 'Optional topic ID to filter by topic',
        },
        limit: {
          type: 'number',
          description: 'Maximum questions to return (default 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'suggest_next_study_topic',
    description:
      'Get personalized study recommendations based on progress, weak areas, and domain weights. ' +
      'Call this when the user asks what to study next, needs guidance on study priorities, ' +
      'or wants a study plan recommendation.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

export type TutorToolName =
  | 'get_study_progress'
  | 'get_question_details'
  | 'search_study_content'
  | 'get_topic_metadata'
  | 'get_assessment_history'
  | 'get_weak_area_questions'
  | 'suggest_next_study_topic';
