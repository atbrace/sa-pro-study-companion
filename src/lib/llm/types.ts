/**
 * Provider-agnostic LLM types and interfaces
 */

/** Provider-agnostic message format */
export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Tool definition (provider-agnostic) */
export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

/** Tool call from the model */
export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  /** Gemini 3+ thought signature for function calls - must be preserved exactly */
  thoughtSignature?: string;
}

/** Result of a tool execution */
export interface LLMToolResult {
  toolCallId: string;
  result: string;
  isError?: boolean;
}

/** Chat request options */
export interface LLMChatOptions {
  systemPrompt: string;
  tools?: LLMTool[];
  maxTokens?: number;
}

/** Response from chat - either final text or tool calls */
export type LLMChatResponse =
  | { type: 'text'; content: string }
  | { type: 'tool_calls'; calls: LLMToolCall[] };

/** Provider names */
export type ProviderName = 'claude' | 'gemini';

/** Consistent error class for LLM operations */
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: ProviderName,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/** A single chunk from a streaming LLM response */
export type LLMStreamChunk =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_calls'; calls: LLMToolCall[] }
  | { type: 'done'; fullText: string };

/** Async generator yielding stream chunks */
export type LLMStreamResponse = AsyncGenerator<LLMStreamChunk, void, unknown>;

/** The provider interface */
export interface LLMProvider {
  /** Send messages and get a response (text or tool calls) */
  chat(messages: LLMMessage[], options: LLMChatOptions): Promise<LLMChatResponse>;

  /** Continue after tool results */
  continueWithToolResults(
    messages: LLMMessage[],
    toolCalls: LLMToolCall[],
    toolResults: LLMToolResult[],
    options: LLMChatOptions
  ): Promise<LLMChatResponse>;

  /** Stream a chat response. Optional — callers must check existence. */
  chatStream?(messages: LLMMessage[], options: LLMChatOptions): LLMStreamResponse;

  /** Stream a continuation after tool results. Optional. */
  continueWithToolResultsStream?(
    messages: LLMMessage[],
    toolCalls: LLMToolCall[],
    toolResults: LLMToolResult[],
    options: LLMChatOptions
  ): LLMStreamResponse;
}
