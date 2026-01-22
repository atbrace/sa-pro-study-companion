import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LLMChatOptions, LLMTool } from '../../types';
import { LLMError } from '../../types';

// Mock the retry module to skip actual delays
vi.mock('../../retry', () => ({
  withRetry: vi.fn((fn) => fn()),
}));

// Mock crypto.randomUUID for consistent test IDs
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue('test-uuid-123'),
});

// Mock the Google AI SDK
const mockSendMessage = vi.fn();
const mockStartChat = vi.fn().mockReturnValue({
  sendMessage: mockSendMessage,
});
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  startChat: mockStartChat,
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

// Import after mocking
import { geminiProvider } from '../gemini';

const sampleTool: LLMTool = {
  name: 'get_study_progress',
  description: 'Get progress',
  parameters: { type: 'object', properties: {}, required: [] },
};

const defaultOptions: LLMChatOptions = {
  systemPrompt: 'You are helpful',
  maxTokens: 100,
};

describe('geminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_AI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY;
  });

  describe('chat', () => {
    it('converts messages to Gemini format and returns text response', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: 'Hello!' }],
              },
            },
          ],
        },
      });

      const response = await geminiProvider.chat(
        [{ role: 'user', content: 'Hi' }],
        defaultOptions
      );

      expect(response).toEqual({ type: 'text', content: 'Hello!' });
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-3-flash-preview',
        systemInstruction: 'You are helpful',
        tools: undefined,
      });
      expect(mockSendMessage).toHaveBeenCalledWith('Hi');
    });

    it('handles function call responses', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'get_study_progress',
                      args: { foo: 'bar' },
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      const response = await geminiProvider.chat(
        [{ role: 'user', content: 'How am I doing?' }],
        { ...defaultOptions, tools: [sampleTool] }
      );

      expect(response.type).toBe('tool_calls');
      if (response.type === 'tool_calls') {
        expect(response.calls).toHaveLength(1);
        expect(response.calls[0]).toEqual({
          id: 'test-uuid-123',
          name: 'get_study_progress',
          arguments: { foo: 'bar' },
        });
      }
    });

    it('generates UUIDs for tool call IDs', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  { functionCall: { name: 'tool_a', args: {} } },
                  { functionCall: { name: 'tool_b', args: {} } },
                ],
              },
            },
          ],
        },
      });

      const response = await geminiProvider.chat(
        [{ role: 'user', content: 'test' }],
        { ...defaultOptions, tools: [sampleTool] }
      );

      expect(response.type).toBe('tool_calls');
      if (response.type === 'tool_calls') {
        expect(response.calls).toHaveLength(2);
        // All calls get UUIDs
        response.calls.forEach(call => {
          expect(call.id).toBe('test-uuid-123');
        });
      }
    });

    it('converts assistant role to model for history', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        },
      });

      await geminiProvider.chat(
        [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
          { role: 'user', content: 'How are you?' },
        ],
        defaultOptions
      );

      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'Hi' }] },
          { role: 'model', parts: [{ text: 'Hello!' }] },
        ],
      });
      expect(mockSendMessage).toHaveBeenCalledWith('How are you?');
    });

    it('throws LLMError when no messages provided', async () => {
      await expect(geminiProvider.chat([], defaultOptions)).rejects.toThrow(
        'No messages provided'
      );
    });

    it('wraps rate limit errors as retryable', async () => {
      mockSendMessage.mockRejectedValue({ status: 429, message: 'Rate limited' });

      try {
        await geminiProvider.chat([{ role: 'user', content: 'test' }], defaultOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.provider).toBe('gemini');
        expect(llmError.statusCode).toBe(429);
        expect(llmError.isRetryable).toBe(true);
      }
    });

    it('wraps auth errors as non-retryable', async () => {
      mockSendMessage.mockRejectedValue({ status: 403, message: 'Forbidden' });

      try {
        await geminiProvider.chat([{ role: 'user', content: 'test' }], defaultOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.provider).toBe('gemini');
        expect(llmError.statusCode).toBe(403);
        expect(llmError.isRetryable).toBe(false);
      }
    });

    it('converts tools to Gemini format', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        },
      });

      await geminiProvider.chat([{ role: 'user', content: 'test' }], {
        ...defaultOptions,
        tools: [sampleTool],
      });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'get_study_progress',
                  description: 'Get progress',
                  parameters: { type: 'object', properties: {}, required: [] },
                },
              ],
            },
          ],
        })
      );
    });

    it('handles empty response candidates gracefully', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [],
        },
      });

      const response = await geminiProvider.chat(
        [{ role: 'user', content: 'test' }],
        defaultOptions
      );

      expect(response).toEqual({ type: 'text', content: '' });
    });
  });

  describe('continueWithToolResults', () => {
    it('sends function responses correctly', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [{ text: 'Based on your progress...' }] } }],
        },
      });

      const messages = [{ role: 'user' as const, content: 'How am I doing?' }];
      const toolCalls = [{ id: 'call-123', name: 'get_study_progress', arguments: {} }];
      const toolResults = [{ toolCallId: 'call-123', result: '{"mastery": 0.75}' }];

      const response = await geminiProvider.continueWithToolResults(
        messages,
        toolCalls,
        toolResults,
        defaultOptions
      );

      expect(response).toEqual({ type: 'text', content: 'Based on your progress...' });

      // Verify history includes the function call
      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'How am I doing?' }] },
          {
            role: 'model',
            parts: [{ functionCall: { name: 'get_study_progress', args: {} } }],
          },
        ],
      });

      // Verify function response sent
      expect(mockSendMessage).toHaveBeenCalledWith([
        {
          functionResponse: {
            name: 'get_study_progress',
            response: { result: '{"mastery": 0.75}', isError: undefined },
          },
        },
      ]);
    });

    it('includes isError in function response', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [{ text: 'Error handled' }] } }],
        },
      });

      const toolCalls = [{ id: 'call-123', name: 'get_data', arguments: {} }];
      const toolResults = [
        { toolCallId: 'call-123', result: 'Database error', isError: true },
      ];

      await geminiProvider.continueWithToolResults([], toolCalls, toolResults, defaultOptions);

      expect(mockSendMessage).toHaveBeenCalledWith([
        {
          functionResponse: {
            name: 'get_data',
            response: { result: 'Database error', isError: true },
          },
        },
      ]);
    });

    it('throws error when tool call ID not found', async () => {
      const toolCalls = [{ id: 'call-123', name: 'tool_a', arguments: {} }];
      const toolResults = [{ toolCallId: 'call-456', result: 'OK' }]; // Wrong ID

      await expect(
        geminiProvider.continueWithToolResults([], toolCalls, toolResults, defaultOptions)
      ).rejects.toThrow('Tool result references unknown tool call ID: call-456');
    });

    it('can return more function calls after function results', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ functionCall: { name: 'another_tool', args: {} } }],
              },
            },
          ],
        },
      });

      const response = await geminiProvider.continueWithToolResults(
        [],
        [{ id: 'call-123', name: 'first_tool', arguments: {} }],
        [{ toolCallId: 'call-123', result: 'OK' }],
        defaultOptions
      );

      expect(response.type).toBe('tool_calls');
      if (response.type === 'tool_calls') {
        expect(response.calls[0].name).toBe('another_tool');
      }
    });
  });
});
