import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Part,
  type Content,
} from '@google/generative-ai';
import type {
  LLMProvider,
  LLMMessage,
  LLMChatOptions,
  LLMChatResponse,
  LLMToolCall,
  LLMToolResult,
  LLMTool,
} from '../types';
import { LLMError } from '../types';
import { withRetry } from '../retry';

function createClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
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

function toGeminiFunctionCallPart(call: LLMToolCall): Part {
  return {
    functionCall: {
      name: call.name,
      args: call.arguments,
    },
  };
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
        const fc = (
          p as { functionCall: { name: string; args: Record<string, unknown> } }
        ).functionCall;
        return {
          id: generateToolCallId(fc.name, fc.args, index),
          name: fc.name,
          arguments: fc.args,
        };
      }),
    };
  }

  const text = parts
    .filter(p => 'text' in p)
    .map(p => (p as { text: string }).text)
    .join('');
  return { type: 'text', content: text };
}

export const geminiProvider: LLMProvider = {
  async chat(messages, options) {
    return withRetry(async () => {
      try {
        const client = createClient();
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
        if (statusCode === 429) {
          throw new LLMError('Rate limit exceeded', 'gemini', 429, true);
        }
        if (statusCode === 401 || statusCode === 403) {
          throw new LLMError('Invalid API key', 'gemini', statusCode, false);
        }
        throw new LLMError(message, 'gemini', statusCode, false);
      }
    });
  },

  async continueWithToolResults(messages, toolCalls, toolResults, options) {
    return withRetry(async () => {
      try {
        const client = createClient();
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
            { role: 'model', parts: toolCalls.map(toGeminiFunctionCallPart) },
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
        if (statusCode === 429) {
          throw new LLMError('Rate limit exceeded', 'gemini', 429, true);
        }
        if (statusCode === 401 || statusCode === 403) {
          throw new LLMError('Invalid API key', 'gemini', statusCode, false);
        }
        throw new LLMError(message, 'gemini', statusCode, false);
      }
    });
  },
};

/**
 * Safely extract status code from an unknown error
 */
function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const e = error as Record<string, unknown>;
  if (typeof e.status === 'number') return e.status;
  if (typeof e.statusCode === 'number') return e.statusCode;
  // Check for nested error structure
  if (typeof e.error === 'object' && e.error !== null) {
    const nested = e.error as Record<string, unknown>;
    if (typeof nested.status === 'number') return nested.status;
  }
  return undefined;
}

/**
 * Safely extract error message from an unknown error
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error !== 'object' || error === null) return 'Unknown error';
  const e = error as Record<string, unknown>;
  if (typeof e.message === 'string') return e.message;
  if (typeof e.error === 'string') return e.error;
  return 'Unknown error';
}
