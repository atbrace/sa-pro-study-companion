import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LLMChatOptions, LLMTool } from '../../types';
import { LLMError } from '../../types';

// Mock the retry module to skip actual delays
vi.mock('../../retry', () => ({
  withRetry: vi.fn((fn) => fn()),
}));

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
import { geminiProvider, resetClient } from '../gemini';

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
    resetClient(); // Reset cached client between tests
    process.env.GOOGLE_AI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY;
    resetClient();
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
        expect(response.calls[0].name).toBe('get_study_progress');
        expect(response.calls[0].arguments).toEqual({ foo: 'bar' });
        // IDs are deterministic based on name, args, and index
        expect(response.calls[0].id).toMatch(/^gemini-tc-[a-f0-9]+-0$/);
      }
    });

    it('generates deterministic IDs for tool calls', async () => {
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
        // Each call gets a unique deterministic ID
        expect(response.calls[0].id).toMatch(/^gemini-tc-[a-f0-9]+-0$/);
        expect(response.calls[1].id).toMatch(/^gemini-tc-[a-f0-9]+-1$/);
        // IDs should be different for different function calls
        expect(response.calls[0].id).not.toBe(response.calls[1].id);
      }
    });

    it('generates consistent IDs for same function call', async () => {
      const mockResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: [
                  { functionCall: { name: 'tool_a', args: { x: 1 } } },
                ],
              },
            },
          ],
        },
      };

      mockSendMessage.mockResolvedValue(mockResponse);
      const response1 = await geminiProvider.chat(
        [{ role: 'user', content: 'test' }],
        { ...defaultOptions, tools: [sampleTool] }
      );

      mockSendMessage.mockResolvedValue(mockResponse);
      const response2 = await geminiProvider.chat(
        [{ role: 'user', content: 'test' }],
        { ...defaultOptions, tools: [sampleTool] }
      );

      // Same input should produce same ID
      if (response1.type === 'tool_calls' && response2.type === 'tool_calls') {
        expect(response1.calls[0].id).toBe(response2.calls[0].id);
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

    it('throws LLMError when API key is missing', async () => {
      delete process.env.GOOGLE_AI_API_KEY;
      resetClient();

      await expect(
        geminiProvider.chat([{ role: 'user', content: 'test' }], defaultOptions)
      ).rejects.toThrow(LLMError);

      try {
        await geminiProvider.chat([{ role: 'user', content: 'test' }], defaultOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.provider).toBe('gemini');
        expect(llmError.message).toContain('GOOGLE_AI_API_KEY');
        expect(llmError.isRetryable).toBe(false);
      }
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

      // Verify history includes the function call with fallback thought_signature (Gemini 3+ requirement)
      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'How am I doing?' }] },
          {
            role: 'model',
            parts: [{
              functionCall: { name: 'get_study_progress', args: {} },
              thought_signature: 'context_engineering_is_the_way_to_go',
              thoughtSignature: 'context_engineering_is_the_way_to_go',
            }],
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

  describe('thought_signature handling (Gemini 3+)', () => {
    it('extracts thought_signature from function call response', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'get_study_progress',
                      args: { examId: 'sap-c02' },
                    },
                    thought_signature: 'encrypted-signature-token-abc123',
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
        expect(response.calls[0].name).toBe('get_study_progress');
        expect(response.calls[0].thoughtSignature).toBe('encrypted-signature-token-abc123');
      }
    });

    it('includes thought_signature in history when continuing with tool results', async () => {
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [{ text: 'Based on your progress...' }] } }],
        },
      });

      const messages = [{ role: 'user' as const, content: 'How am I doing?' }];
      const toolCalls = [
        {
          id: 'call-123',
          name: 'get_study_progress',
          arguments: { examId: 'sap-c02' },
          thoughtSignature: 'encrypted-signature-token-abc123',
        },
      ];
      const toolResults = [{ toolCallId: 'call-123', result: '{"mastery": 0.75}' }];

      await geminiProvider.continueWithToolResults(
        messages,
        toolCalls,
        toolResults,
        defaultOptions
      );

      // Verify history includes the function call WITH thought_signature (both formats)
      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'How am I doing?' }] },
          {
            role: 'model',
            parts: [
              {
                functionCall: { name: 'get_study_progress', args: { examId: 'sap-c02' } },
                thought_signature: 'encrypted-signature-token-abc123',
                thoughtSignature: 'encrypted-signature-token-abc123',
              },
            ],
          },
        ],
      });
    });

    it('handles multiple function calls with only first having thought_signature', async () => {
      // Per Gemini docs: for parallel function calls, only the first gets a signature
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: { name: 'tool_a', args: {} },
                    thought_signature: 'signature-for-first-call',
                  },
                  {
                    functionCall: { name: 'tool_b', args: {} },
                    // No thought_signature for subsequent parallel calls
                  },
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
        expect(response.calls[0].thoughtSignature).toBe('signature-for-first-call');
        expect(response.calls[1].thoughtSignature).toBeUndefined();
      }
    });

    it('works without thought_signature for Gemini 2.x models', async () => {
      // Gemini 2.x doesn't require thought_signature
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'get_study_progress',
                      args: {},
                    },
                    // No thought_signature field at all
                  },
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
        expect(response.calls[0].thoughtSignature).toBeUndefined();
      }
    });

    it('preserves thought_signature exactly as received without modification', async () => {
      const originalSignature = 'ABCdef123!@#$%^&*()_+-=[]{}|;:,.<>?';

      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: { name: 'test_tool', args: {} },
                    thought_signature: originalSignature,
                  },
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

      if (response.type === 'tool_calls') {
        // Signature must be preserved exactly - no encoding, decoding, or modification
        expect(response.calls[0].thoughtSignature).toBe(originalSignature);
      }
    });
  });
});
