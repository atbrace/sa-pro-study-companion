import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Tools available to the tutor for fetching dynamic data
 */
export const TUTOR_TOOLS: Tool[] = [
  {
    name: 'get_study_progress',
    description:
      "Get the student's current study progress including mastery scores, weak areas, and exam readiness. " +
      'Call this when the user asks about their progress, what to study next, how they are doing, ' +
      'their weak areas, or whether they are ready for the exam.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

export type TutorToolName = 'get_study_progress';
