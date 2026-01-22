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

function parseGeminiResponse(response: unknown): LLMChatResponse {
  const resp = response as {
    candidates?: Array<{ content?: { parts?: Part[] } }>;
  };
  const parts = resp.candidates?.[0]?.content?.parts || [];

  const functionCalls = parts.filter(p => 'functionCall' in p && p.functionCall);
  if (functionCalls.length > 0) {
    return {
      type: 'tool_calls',
      calls: functionCalls.map(p => {
        const fc = (
          p as { functionCall: { name: string; args: Record<string, unknown> } }
        ).functionCall;
        return {
          id: crypto.randomUUID(),
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
        const err = error as { status?: number; message?: string };
        if (err.status === 429) {
          throw new LLMError('Rate limit exceeded', 'gemini', 429, true);
        }
        if (err.status === 401 || err.status === 403) {
          throw new LLMError('Invalid API key', 'gemini', err.status, false);
        }
        throw new LLMError(err.message || 'Unknown error', 'gemini', err.status, false);
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
        const err = error as { status?: number; message?: string };
        if (err.status === 429) {
          throw new LLMError('Rate limit exceeded', 'gemini', 429, true);
        }
        if (err.status === 401 || err.status === 403) {
          throw new LLMError('Invalid API key', 'gemini', err.status, false);
        }
        throw new LLMError(err.message || 'Unknown error', 'gemini', err.status, false);
      }
    });
  },
};
