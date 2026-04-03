import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Part,
  type Content,
  type GenerateContentStreamResult,
} from '@google/generative-ai';
import type {
  LLMProvider,
  LLMMessage,
  LLMChatOptions,
  LLMChatResponse,
  LLMToolCall,
  LLMToolResult,
  LLMTool,
  LLMStreamChunk,
} from '../types';
import { LLMError } from '../types';
import { withRetry } from '../retry';

// Cache the client instance to avoid re-instantiation overhead
let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  // Defensive check: validate API key exists before creating client
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      'GOOGLE_AI_API_KEY environment variable is not set',
      'gemini',
      500,
      false
    );
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }
  return cachedClient;
}

/**
 * Reset the cached client (for testing only)
 */
export function resetClient(): void {
  cachedClient = null;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
}

function toGeminiHistory(messages: LLMMessage[]): Content[] {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

function toGeminiFunctionDeclaration(tool: LLMTool): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters as unknown as FunctionDeclarationSchema,
  };
}

// Fallback signature for Gemini 3+ when SDK doesn't provide one
// See: https://ai.google.dev/gemini-api/docs/gemini-3
const FALLBACK_THOUGHT_SIGNATURE = 'context_engineering_is_the_way_to_go';

function toGeminiFunctionCallPart(call: LLMToolCall, index: number): Part {
  // Gemini 3 requires thought_signature for function calls
  // Only the first function call in parallel calls needs the signature
  const signature = call.thoughtSignature || (index === 0 ? FALLBACK_THOUGHT_SIGNATURE : undefined);

  // Use both snake_case and camelCase to maximize compatibility
  const part: Part & { thought_signature?: string; thoughtSignature?: string } = {
    functionCall: {
      name: call.name,
      args: call.arguments,
    },
  };

  if (signature) {
    part.thought_signature = signature;
    part.thoughtSignature = signature;
  }

  return part as Part;
}

function toGeminiFunctionResponsePart(
  toolCall: LLMToolCall,
  result: LLMToolResult
): Part {
  return {
    functionResponse: {
      name: toolCall.name, // Gemini needs the function name, not the call ID
      response: { result: result.result, isError: result.isError },
    },
  };
}

/**
 * Generate a deterministic ID for a tool call based on function name and arguments.
 * This ensures consistent IDs when matching tool results back to their calls.
 */
function generateToolCallId(name: string, args: Record<string, unknown>, index: number): string {
  const argsStr = JSON.stringify(args);
  // Use a simple hash based on name + args + index for deterministic ID
  let hash = 0;
  const str = `${name}:${argsStr}:${index}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `gemini-tc-${Math.abs(hash).toString(16)}-${index}`;
}

function isGeminiResponse(response: unknown): response is {
  candidates?: Array<{ content?: { parts?: Part[] } }>;
} {
  if (typeof response !== 'object' || response === null) return false;
  const r = response as Record<string, unknown>;
  if (r.candidates !== undefined && !Array.isArray(r.candidates)) return false;
  return true;
}

function parseGeminiResponse(response: unknown): LLMChatResponse {
  if (!isGeminiResponse(response)) {
    throw new LLMError('Invalid response format from Gemini', 'gemini', 500, false);
  }
  const parts = response.candidates?.[0]?.content?.parts || [];

  const functionCalls = parts.filter(p => 'functionCall' in p && p.functionCall);
  if (functionCalls.length > 0) {
    return {
      type: 'tool_calls',
      calls: functionCalls.map((p, index) => {
        const partWithSig = p as {
          functionCall: { name: string; args: Record<string, unknown> };
          thought_signature?: string;
          thoughtSignature?: string;
        };
        const fc = partWithSig.functionCall;
        const call: LLMToolCall = {
          id: generateToolCallId(fc.name, fc.args, index),
          name: fc.name,
          arguments: fc.args,
        };
        // Check both snake_case and camelCase variants
        const signature = partWithSig.thought_signature || partWithSig.thoughtSignature;
        if (signature) {
          call.thoughtSignature = signature;
        }
        return call;
      }),
    };
  }

  const text = parts
    .filter(p => 'text' in p)
    .map(p => (p as { text: string }).text)
    .join('');
  return { type: 'text', content: text };
}

/**
 * Async generator that yields LLMStreamChunks from a Gemini streaming result.
 *
 * Text deltas are yielded as they arrive from the stream. Function calls are
 * collected from the final aggregated response (not from individual chunks)
 * to ensure we get the complete call data including thought_signature.
 */
async function* streamGeminiResult(
  result: GenerateContentStreamResult
): AsyncGenerator<LLMStreamChunk, void, unknown> {
  let fullText = '';

  try {
    for await (const chunk of result.stream) {
      // chunk.text() throws if the response was blocked by safety filters
      try {
        const text = chunk.text();
        if (text) {
          fullText += text;
          yield { type: 'text_delta', delta: text };
        }
      } catch {
        // Safety filter block or no text content — skip this chunk
      }
    }

    // After the stream completes, check the aggregated response for function calls
    const response = await result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];
    const functionCalls = parts.filter(p => 'functionCall' in p && p.functionCall);

    if (functionCalls.length > 0) {
      const calls: LLMToolCall[] = functionCalls.map((p, index) => {
        const partWithSig = p as {
          functionCall: { name: string; args: Record<string, unknown> };
          thought_signature?: string;
          thoughtSignature?: string;
        };
        const fc = partWithSig.functionCall;
        const call: LLMToolCall = {
          id: generateToolCallId(fc.name, fc.args, index),
          name: fc.name,
          arguments: fc.args,
        };
        const signature = partWithSig.thought_signature || partWithSig.thoughtSignature;
        if (signature) {
          call.thoughtSignature = signature;
        }
        return call;
      });
      yield { type: 'tool_calls', calls };
    } else {
      yield { type: 'done', fullText };
    }
  } catch (error) {
    // Convert stream-iteration errors to LLMError for proper categorization
    if (error instanceof LLMError) throw error;
    const statusCode = extractStatusCode(error);
    const message = extractErrorMessage(error);
    const isRetryable = statusCode === 429 || (statusCode !== undefined && statusCode >= 500 && statusCode <= 599);
    throw new LLMError(message, 'gemini', statusCode, isRetryable);
  }
}

export const geminiProvider: LLMProvider = {
  async chat(messages, options) {
    return withRetry(async () => {
      try {
        const client = getClient();
        const modelName = getModelName();
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: options.systemPrompt,
          tools: options.tools
            ? [{ functionDeclarations: options.tools.map(toGeminiFunctionDeclaration) }]
            : undefined,
        });

        const history = messages.slice(0, -1);
        const lastMessage = messages.at(-1);

        if (!lastMessage) {
          throw new LLMError('No messages provided', 'gemini', 400, false);
        }

        const chat = model.startChat({
          history: toGeminiHistory(history),
        });

        const result = await chat.sendMessage(lastMessage.content);
        return parseGeminiResponse(result.response);
      } catch (error: unknown) {
        if (error instanceof LLMError) throw error;
        const statusCode = extractStatusCode(error);
        const message = extractErrorMessage(error);
        const isRetryable = statusCode === 429 || (statusCode !== undefined && statusCode >= 500 && statusCode <= 599);
        if (statusCode === 401 || statusCode === 403) {
          throw new LLMError('Invalid API key', 'gemini', statusCode, false);
        }
        throw new LLMError(message, 'gemini', statusCode, isRetryable);
      }
    });
  },

  async continueWithToolResults(messages, toolCalls, toolResults, options) {
    return withRetry(async () => {
      try {
        const client = getClient();
        const modelName = getModelName();
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: options.systemPrompt,
          tools: options.tools
            ? [{ functionDeclarations: options.tools.map(toGeminiFunctionDeclaration) }]
            : undefined,
        });

        const chat = model.startChat({
          history: [
            ...toGeminiHistory(messages),
            { role: 'model', parts: toolCalls.map((tc, idx) => toGeminiFunctionCallPart(tc, idx)) },
          ],
        });

        // Map tool results with their corresponding tool calls to get function names
        const functionResponses = toolResults.map(result => {
          const toolCall = toolCalls.find(tc => tc.id === result.toolCallId);
          if (!toolCall) {
            throw new LLMError(
              `Tool result references unknown tool call ID: ${result.toolCallId}`,
              'gemini',
              400,
              false
            );
          }
          return toGeminiFunctionResponsePart(toolCall, result);
        });
        const result = await chat.sendMessage(functionResponses);
        return parseGeminiResponse(result.response);
      } catch (error: unknown) {
        if (error instanceof LLMError) throw error;
        const statusCode = extractStatusCode(error);
        const message = extractErrorMessage(error);
        const isRetryable = statusCode === 429 || (statusCode !== undefined && statusCode >= 500 && statusCode <= 599);
        if (statusCode === 401 || statusCode === 403) {
          throw new LLMError('Invalid API key', 'gemini', statusCode, false);
        }
        throw new LLMError(message, 'gemini', statusCode, isRetryable);
      }
    });
  },

  async *chatStream(messages, options) {
    // Wrap creation + iteration in withRetry so errors during stream
    // iteration (e.g., 429/503 from Gemini) are retried
    const chunks = await withRetry(async () => {
      try {
        const client = getClient();
        const modelName = getModelName();
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: options.systemPrompt,
          tools: options.tools
            ? [{ functionDeclarations: options.tools.map(toGeminiFunctionDeclaration) }]
            : undefined,
        });

        const history = messages.slice(0, -1);
        const lastMessage = messages.at(-1);

        if (!lastMessage) {
          throw new LLMError('No messages provided', 'gemini', 400, false);
        }

        const chat = model.startChat({
          history: toGeminiHistory(history),
        });

        const result = await chat.sendMessageStream(lastMessage.content);
        const collected: LLMStreamChunk[] = [];
        for await (const chunk of streamGeminiResult(result)) {
          collected.push(chunk);
        }
        return collected;
      } catch (error: unknown) {
        if (error instanceof LLMError) throw error;
        const statusCode = extractStatusCode(error);
        const message = extractErrorMessage(error);
        const isRetryable = statusCode === 429 || (statusCode !== undefined && statusCode >= 500 && statusCode <= 599);
        if (statusCode === 401 || statusCode === 403) {
          throw new LLMError('Invalid API key', 'gemini', statusCode, false);
        }
        throw new LLMError(message, 'gemini', statusCode, isRetryable);
      }
    });
    yield* chunks;
  },

  async *continueWithToolResultsStream(messages, toolCalls, toolResults, options) {
    const chunks = await withRetry(async () => {
      try {
        const client = getClient();
        const modelName = getModelName();
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: options.systemPrompt,
          tools: options.tools
            ? [{ functionDeclarations: options.tools.map(toGeminiFunctionDeclaration) }]
            : undefined,
        });

        const chat = model.startChat({
          history: [
            ...toGeminiHistory(messages),
            { role: 'model', parts: toolCalls.map((tc, idx) => toGeminiFunctionCallPart(tc, idx)) },
          ],
        });

        // Map tool results with their corresponding tool calls to get function names
        const functionResponses = toolResults.map(result => {
          const toolCall = toolCalls.find(tc => tc.id === result.toolCallId);
          if (!toolCall) {
            throw new LLMError(
              `Tool result references unknown tool call ID: ${result.toolCallId}`,
              'gemini',
              400,
              false
            );
          }
          return toGeminiFunctionResponsePart(toolCall, result);
        });

        const streamResult = await chat.sendMessageStream(functionResponses);
        const collected: LLMStreamChunk[] = [];
        for await (const chunk of streamGeminiResult(streamResult)) {
          collected.push(chunk);
        }
        return collected;
      } catch (error: unknown) {
        if (error instanceof LLMError) throw error;
        const statusCode = extractStatusCode(error);
        const message = extractErrorMessage(error);
        const isRetryable = statusCode === 429 || (statusCode !== undefined && statusCode >= 500 && statusCode <= 599);
        if (statusCode === 401 || statusCode === 403) {
          throw new LLMError('Invalid API key', 'gemini', statusCode, false);
        }
        throw new LLMError(message, 'gemini', statusCode, isRetryable);
      }
    });
    yield* streamGeminiResult(result);
  },
};

/**
 * Safely extract status code from an unknown error.
 * Logs unexpected error formats for monitoring and debugging.
 */
function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    // Log unexpected non-object error format
    console.warn('[Gemini] Unexpected error format (non-object):', typeof error);
    return undefined;
  }

  const e = error as Record<string, unknown>;
  if (typeof e.status === 'number') return e.status;
  if (typeof e.statusCode === 'number') return e.statusCode;

  // Check for nested error structure
  if (typeof e.error === 'object' && e.error !== null) {
    const nested = e.error as Record<string, unknown>;
    if (typeof nested.status === 'number') return nested.status;
  }

  // Log unexpected error structure for future improvements
  if (e.status === undefined && e.statusCode === undefined) {
    console.warn('[Gemini] Unexpected error structure, no status code found:', Object.keys(e));
  }

  return undefined;
}

/**
 * Safely extract error message from an unknown error.
 * Logs unexpected error formats for monitoring and debugging.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (typeof error !== 'object' || error === null) {
    console.warn('[Gemini] Unexpected error format (non-object):', typeof error, error);
    return 'Unknown error';
  }

  const e = error as Record<string, unknown>;
  if (typeof e.message === 'string') return e.message;
  if (typeof e.error === 'string') return e.error;

  // Log unexpected error structure for future improvements
  console.warn('[Gemini] Unexpected error structure, no message found:', JSON.stringify(e).slice(0, 200));
  return 'Unknown error';
}
