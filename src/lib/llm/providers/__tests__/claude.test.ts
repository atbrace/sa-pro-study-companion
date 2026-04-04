import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LLMChatOptions, LLMTool } from '../../types';
import { LLMError } from '../../types';

// Mock the retry module to skip actual delays
vi.mock('../../retry', () => ({
  withRetry: vi.fn((fn) => fn()),
}));

// Mock the Anthropic SDK
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  // Create mock APIError inside the factory function
  class APIError extends Error {
    status: number;
    constructor(status: number, _body: unknown, message: string, _headers: unknown) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));

  // Attach APIError to the default export like the real SDK
  MockAnthropic.APIError = APIError;

  return {
    default: MockAnthropic,
    APIError,
  };
});

// Import after mocking
import Anthropic from '@anthropic-ai/sdk';
import { claudeProvider, resetClient } from '../claude';

const sampleTool: LLMTool = {
  name: 'get_study_progress',
  description: 'Get progress',
  parameters: { type: 'object', properties: {}, required: [] },
};

const defaultOptions: LLMChatOptions = {
  systemPrompt: 'You are helpful',
  maxTokens: 100,
};

describe('claudeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetClient(); // Reset cached client between tests
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    resetClient();
  });

  describe('chat', () => {
    it('converts messages to Claude format and returns text response', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello!' }],
      });

      const response = await claudeProvider.chat(
        [{ role: 'user', content: 'Hi' }],
        defaultOptions
      );

      expect(response).toEqual({ type: 'text', content: 'Hello!' });
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 100,
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Hi' }],
        tools: undefined,
      });
    });

    it('handles tool_use stop reason', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'call-123',
            name: 'get_study_progress',
            input: { foo: 'bar' },
          },
        ],
      });

      const response = await claudeProvider.chat(
        [{ role: 'user', content: 'How am I doing?' }],
        { ...defaultOptions, tools: [sampleTool] }
      );

      expect(response.type).toBe('tool_calls');
      if (response.type === 'tool_calls') {
        expect(response.calls).toHaveLength(1);
        expect(response.calls[0]).toEqual({
          id: 'call-123',
          name: 'get_study_progress',
          arguments: { foo: 'bar' },
        });
      }
    });

    it('handles multiple tool calls', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'call-1', name: 'tool_a', input: {} },
          { type: 'tool_use', id: 'call-2', name: 'tool_b', input: { x: 1 } },
        ],
      });

      const response = await claudeProvider.chat(
        [{ role: 'user', content: 'test' }],
        { ...defaultOptions, tools: [sampleTool] }
      );

      expect(response.type).toBe('tool_calls');
      if (response.type === 'tool_calls') {
        expect(response.calls).toHaveLength(2);
        expect(response.calls[0].id).toBe('call-1');
        expect(response.calls[1].id).toBe('call-2');
      }
    });

    it('returns empty content when no text block present', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'end_turn',
        content: [],
      });

      const response = await claudeProvider.chat(
        [{ role: 'user', content: 'test' }],
        defaultOptions
      );

      expect(response).toEqual({ type: 'text', content: '' });
    });

    it('wraps rate limit errors as retryable', async () => {
      mockCreate.mockRejectedValue(new Anthropic.APIError(429, undefined, 'Too many requests', undefined));

      await expect(
        claudeProvider.chat([{ role: 'user', content: 'test' }], defaultOptions)
      ).rejects.toThrow(LLMError);

      try {
        await claudeProvider.chat([{ role: 'user', content: 'test' }], defaultOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.provider).toBe('claude');
        expect(llmError.statusCode).toBe(429);
        expect(llmError.isRetryable).toBe(true);
      }
    });

    it('does not set quota_exhausted code for 429 (Anthropic has no quota concept)', async () => {
      // Anthropic 429s are always transient rate limits — no daily quota like Gemini.
      // All 429s should remain retryable with no error code set.
      mockCreate.mockRejectedValue(new Anthropic.APIError(429, undefined, 'Too many requests', undefined));

      try {
        await claudeProvider.chat([{ role: 'user', content: 'test' }], defaultOptions);
      } catch (error) {
        const llmError = error as LLMError;
        expect(llmError.code).toBeUndefined();
        expect(llmError.isRetryable).toBe(true);
      }
    });

    it('wraps auth errors as non-retryable', async () => {
      mockCreate.mockRejectedValue(new Anthropic.APIError(401, undefined, 'Invalid API key', undefined));

      try {
        await claudeProvider.chat([{ role: 'user', content: 'test' }], defaultOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.provider).toBe('claude');
        expect(llmError.statusCode).toBe(401);
        expect(llmError.isRetryable).toBe(false);
      }
    });

    it('converts tools to Claude format', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'OK' }],
      });

      await claudeProvider.chat([{ role: 'user', content: 'test' }], {
        ...defaultOptions,
        tools: [sampleTool],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              name: 'get_study_progress',
              description: 'Get progress',
              input_schema: { type: 'object', properties: {}, required: [] },
            },
          ],
        })
      );
    });

    it('throws LLMError when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      resetClient();

      await expect(
        claudeProvider.chat([{ role: 'user', content: 'test' }], defaultOptions)
      ).rejects.toThrow(LLMError);

      try {
        await claudeProvider.chat([{ role: 'user', content: 'test' }], defaultOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.provider).toBe('claude');
        expect(llmError.message).toContain('ANTHROPIC_API_KEY');
        expect(llmError.isRetryable).toBe(false);
      }
    });
  });

  describe('continueWithToolResults', () => {
    it('includes tool results in message history', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Based on your progress...' }],
      });

      const messages = [{ role: 'user' as const, content: 'How am I doing?' }];
      const toolCalls = [{ id: 'call-123', name: 'get_study_progress', arguments: {} }];
      const toolResults = [{ toolCallId: 'call-123', result: '{"mastery": 0.75}' }];

      const response = await claudeProvider.continueWithToolResults(
        messages,
        toolCalls,
        toolResults,
        defaultOptions
      );

      expect(response).toEqual({ type: 'text', content: 'Based on your progress...' });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'How am I doing?' },
            {
              role: 'assistant',
              content: [
                { type: 'tool_use', id: 'call-123', name: 'get_study_progress', input: {} },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: 'call-123',
                  content: '{"mastery": 0.75}',
                  is_error: undefined,
                },
              ],
            },
          ],
        })
      );
    });

    it('marks error results with is_error', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Sorry, I could not get the data' }],
      });

      const toolCalls = [{ id: 'call-123', name: 'get_study_progress', arguments: {} }];
      const toolResults = [
        { toolCallId: 'call-123', result: 'Database error', isError: true },
      ];

      await claudeProvider.continueWithToolResults([], toolCalls, toolResults, defaultOptions);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: [
                expect.objectContaining({
                  type: 'tool_result',
                  is_error: true,
                }),
              ],
            }),
          ]),
        })
      );
    });

    it('can return more tool calls after tool results', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'call-456', name: 'another_tool', input: {} },
        ],
      });

      const response = await claudeProvider.continueWithToolResults(
        [],
        [{ id: 'call-123', name: 'first_tool', arguments: {} }],
        [{ toolCallId: 'call-123', result: 'OK' }],
        defaultOptions
      );

      expect(response.type).toBe('tool_calls');
      if (response.type === 'tool_calls') {
        expect(response.calls[0].id).toBe('call-456');
      }
    });
  });
});
