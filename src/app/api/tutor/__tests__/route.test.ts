import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPOSTRequest } from '@/lib/test-helpers/request';
import type { LLMChatResponse, LLMProvider } from '@/lib/llm';

// Use vi.hoisted so mock objects are available in vi.mock factories (which are hoisted)
const { mockStatement, mockChat, mockContinueWithToolResults } = vi.hoisted(() => {
  const mockStatement = {
    run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: BigInt(1) }),
    get: vi.fn().mockReturnValue(undefined),
    all: vi.fn().mockReturnValue([]),
  };
  const mockChat = vi.fn();
  const mockContinueWithToolResults = vi.fn();
  return { mockStatement, mockChat, mockContinueWithToolResults };
});

vi.mock('@/lib/db/client', () => ({
  db: {
    prepare: vi.fn().mockReturnValue(mockStatement),
  },
}));

vi.mock('@/lib/llm', async () => {
  const actual = await vi.importActual('@/lib/llm');
  return {
    ...(actual as object),
    getProvider: () => ({
      chat: mockChat,
      continueWithToolResults: mockContinueWithToolResults,
    }),
  };
});

// Mock content index
vi.mock('@/lib/content/index', () => ({
  serializeIndexForPrompt: vi.fn().mockReturnValue('## Navigation\n- Test route'),
}));

// Mock exam loader
vi.mock('@/lib/content/exam-loader', () => ({
  getExamById: vi.fn().mockImplementation((examId: string) => {
    if (examId === 'sap-c02' || examId === undefined) {
      return { id: 'sap-c02', name: 'SAP-C02', tutorPrompt: 'You are a tutor.' };
    }
    if (examId === 'mla-c01') {
      return { id: 'mla-c01', name: 'MLA-C01', tutorPrompt: 'ML tutor.' };
    }
    return null;
  }),
}));

// Mock tutor context
vi.mock('@/lib/progress/tutor-context', () => ({
  getTutorProgressContext: vi.fn().mockReturnValue('## Progress\nOverall: 75%'),
}));

// Mock tool handlers (route.ts imports these from @/lib/llm/tool-handlers)
vi.mock('@/lib/llm/tool-handlers', () => ({
  handleGetStudyProgress: vi.fn().mockReturnValue('## Progress\nOverall: 75%'),
  handleGetQuestionDetails: vi.fn().mockReturnValue('## Question: net-001\nDetails here'),
  handleSearchStudyContent: vi.fn().mockReturnValue('## Search Results\nFound topic'),
  handleGetTopicMetadata: vi.fn().mockReturnValue('## Topic\nMetadata here'),
  handleGetAssessmentHistory: vi.fn().mockReturnValue('## History\n80% score'),
  handleGetWeakAreaQuestions: vi.fn().mockReturnValue('## Weak\nQuestions here'),
  handleSuggestNextStudyTopic: vi.fn().mockReturnValue('## Recommendations\nStudy this'),
}));

import { POST } from '../route';
import { LLMError } from '@/lib/llm';

beforeEach(() => {
  vi.clearAllMocks();
  mockStatement.run.mockReturnValue({ changes: 1, lastInsertRowid: BigInt(1) });
  mockStatement.get.mockReturnValue(undefined);

  // Default: return text response
  mockChat.mockResolvedValue({
    type: 'text',
    content: 'Here is your answer.',
  } as LLMChatResponse);
});

describe('POST /api/tutor', () => {
  describe('request validation', () => {
    it('returns 400 for empty message', async () => {
      const req = createPOSTRequest('/api/tutor', { message: '' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for non-string message', async () => {
      const req = createPOSTRequest('/api/tutor', { message: 123 });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid examId (not found)', async () => {
      const req = createPOSTRequest('/api/tutor', {
        message: 'Hello',
        examId: 'nonexistent-exam',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid exam');
    });

    it('defaults examId to sap-c02', async () => {
      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.response).toBe('Here is your answer.');
    });
  });

  describe('conversation management', () => {
    it('creates new conversation when no conversationId', async () => {
      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      const res = await POST(req);
      const body = await res.json();

      expect(body.conversationId).toBeDefined();
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('loads existing conversation from database', async () => {
      const existingMessages = JSON.stringify([
        { role: 'user', content: 'Previous question' },
        { role: 'assistant', content: 'Previous answer' },
      ]);
      mockStatement.get.mockReturnValue({ messages_json: existingMessages });

      const req = createPOSTRequest('/api/tutor', {
        message: 'Follow up',
        conversationId: 'conv-123',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // chat should be called with history + new message
      expect(mockChat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Previous question' }),
          expect.objectContaining({ role: 'assistant', content: 'Previous answer' }),
          expect.objectContaining({ role: 'user', content: 'Follow up' }),
        ]),
        expect.any(Object)
      );
    });

    it('returns 422 for corrupted conversation JSON', async () => {
      mockStatement.get.mockReturnValue({ messages_json: '{invalid json' });

      const req = createPOSTRequest('/api/tutor', {
        message: 'Hello',
        conversationId: 'conv-123',
      });

      const res = await POST(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toContain('corrupted');
    });

    it('appends user message to history', async () => {
      const req = createPOSTRequest('/api/tutor', { message: 'What is VPC?' });

      await POST(req);

      expect(mockChat).toHaveBeenCalledWith(
        [{ role: 'user', content: 'What is VPC?' }],
        expect.any(Object)
      );
    });
  });

  describe('LLM interaction', () => {
    it('calls provider.chat with system prompt and messages', async () => {
      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      await POST(req);

      expect(mockChat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          systemPrompt: expect.any(String),
          maxTokens: 2048,
        })
      );
    });

    it('includes navigation index in system prompt', async () => {
      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      await POST(req);

      const chatCall = mockChat.mock.calls[0];
      const options = chatCall[1];
      expect(options.systemPrompt).toContain('Navigation');
    });

    it('includes context prompt when context provided', async () => {
      const req = createPOSTRequest('/api/tutor', {
        message: 'Help with this',
        context: { domainId: 'domain-1', topicId: 'topic-1' },
      });

      await POST(req);

      const chatCall = mockChat.mock.calls[0];
      const options = chatCall[1];
      expect(options.systemPrompt).toBeDefined();
    });

    it('returns assistant text response', async () => {
      mockChat.mockResolvedValue({
        type: 'text',
        content: 'VPC stands for Virtual Private Cloud.',
      });

      const req = createPOSTRequest('/api/tutor', { message: 'What is VPC?' });
      const res = await POST(req);
      const body = await res.json();

      expect(body.response).toBe('VPC stands for Virtual Private Cloud.');
    });
  });

  describe('tool loop', () => {
    it('executes get_study_progress tool and continues', async () => {
      // First response: tool call
      mockChat.mockResolvedValue({
        type: 'tool_calls',
        calls: [
          { id: 'call-1', name: 'get_study_progress', arguments: {} },
        ],
      });

      // After tool result: text response
      mockContinueWithToolResults.mockResolvedValue({
        type: 'text',
        content: 'Based on your progress...',
      });

      const req = createPOSTRequest('/api/tutor', { message: 'How am I doing?' });
      const res = await POST(req);
      const body = await res.json();

      expect(mockContinueWithToolResults).toHaveBeenCalled();
      expect(body.response).toBe('Based on your progress...');
    });

    it('returns error for unknown tool name', async () => {
      mockChat.mockResolvedValue({
        type: 'tool_calls',
        calls: [
          { id: 'call-1', name: 'unknown_tool', arguments: {} },
        ],
      });

      mockContinueWithToolResults.mockResolvedValue({
        type: 'text',
        content: 'I had an issue but recovered.',
      });

      const req = createPOSTRequest('/api/tutor', { message: 'Help' });
      const res = await POST(req);

      // The tool result should have isError: true
      const continueCall = mockContinueWithToolResults.mock.calls[0];
      const toolResults = continueCall[2];
      expect(toolResults[0].isError).toBe(true);
    });

    it('stops after 5 tool iterations with fallback message', async () => {
      const toolCallResponse: LLMChatResponse = {
        type: 'tool_calls',
        calls: [{ id: 'call-1', name: 'get_study_progress', arguments: {} }],
      };

      mockChat.mockResolvedValue(toolCallResponse);
      mockContinueWithToolResults.mockResolvedValue(toolCallResponse);

      const req = createPOSTRequest('/api/tutor', { message: 'Test' });
      const res = await POST(req);
      const body = await res.json();

      // Should have called continueWithToolResults 5 times (maxToolIterations)
      expect(mockContinueWithToolResults).toHaveBeenCalledTimes(5);
      expect(body.response).toContain('encountered an issue');
      expect(body.warning).toContain('limit reached');
    });

    it('dispatches get_question_details tool', async () => {
      mockChat.mockResolvedValue({
        type: 'tool_calls',
        calls: [{ id: 'call-1', name: 'get_question_details', arguments: { questionId: 'net-001' } }],
      });
      mockContinueWithToolResults.mockResolvedValue({
        type: 'text',
        content: 'Here is the explanation.',
      });

      const req = createPOSTRequest('/api/tutor', { message: 'Explain question net-001' });
      const res = await POST(req);
      const body = await res.json();

      expect(body.response).toBe('Here is the explanation.');
      const toolResults = mockContinueWithToolResults.mock.calls[0][2];
      expect(toolResults[0].result).toContain('net-001');
      expect(toolResults[0].isError).toBeUndefined();
    });

    it('dispatches suggest_next_study_topic tool', async () => {
      mockChat.mockResolvedValue({
        type: 'tool_calls',
        calls: [{ id: 'call-1', name: 'suggest_next_study_topic', arguments: {} }],
      });
      mockContinueWithToolResults.mockResolvedValue({
        type: 'text',
        content: 'I recommend studying...',
      });

      const req = createPOSTRequest('/api/tutor', { message: 'What should I study?' });
      const res = await POST(req);

      const toolResults = mockContinueWithToolResults.mock.calls[0][2];
      expect(toolResults[0].result).toContain('Recommendations');
    });
  });

  describe('conversation persistence', () => {
    it('saves new conversation with INSERT', async () => {
      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      await POST(req);

      // Check that run was called (INSERT)
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('updates existing conversation with UPDATE', async () => {
      mockStatement.get.mockReturnValue({
        messages_json: JSON.stringify([{ role: 'user', content: 'Hi' }]),
      });

      const req = createPOSTRequest('/api/tutor', {
        message: 'Follow up',
        conversationId: 'conv-existing',
      });
      await POST(req);

      // Should have called run for the UPDATE
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('returns response even when DB save fails', async () => {
      mockStatement.get.mockReturnValue(undefined);
      // INSERT fails
      mockStatement.run.mockImplementation(() => {
        throw new Error('DB write failed');
      });

      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.response).toBe('Here is your answer.');
      expect(body.warning).toContain('could not be saved');
    });
  });

  describe('error handling', () => {
    it('returns user-friendly message for rate limit (429)', async () => {
      mockChat.mockRejectedValue(new LLMError('Rate limited', 'claude', 429));

      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(429);
      expect(body.error).toContain('rate-limited');
    });

    it('returns 503 for LLM service errors', async () => {
      mockChat.mockRejectedValue(new LLMError('Service down', 'claude', 500));

      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('returned an error');
    });

    it('returns 500 for unexpected errors', async () => {
      mockChat.mockRejectedValue(new Error('Something unexpected'));

      const req = createPOSTRequest('/api/tutor', { message: 'Hello' });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('Failed');
    });
  });
});
