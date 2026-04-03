// Types
export type {
  LLMMessage,
  LLMTool,
  LLMToolCall,
  LLMToolResult,
  LLMChatOptions,
  LLMChatResponse,
  LLMStreamChunk,
  LLMStreamResponse,
  LLMProvider,
  ProviderName,
} from './types';

export { LLMError } from './types';

// Provider factory
export { getProvider, getProviderName, resetProvider } from './provider';

// Tools
export { TUTOR_TOOLS, type TutorToolName } from './tools';

// Prompts
export {
  buildTutorSystemPrompt,
  buildContextPrompt,
  generateSuggestedQuestions,
  DEFAULT_TUTOR_PROMPT,
  type TutorContext,
} from './prompts';

// Tool handlers
export {
  handleGetStudyProgress,
  handleGetQuestionDetails,
  handleSearchStudyContent,
  handleGetTopicMetadata,
  handleGetAssessmentHistory,
  handleGetWeakAreaQuestions,
  handleSuggestNextStudyTopic,
} from './tool-handlers';

// Retry utility
export { withRetry, type RetryOptions } from './retry';
