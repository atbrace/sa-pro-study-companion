# LLM Provider Abstraction Design

## Overview

Add support for multiple LLM providers (Claude and Gemini) to enable cost optimization. Provider selection happens via environment variable at deploy time - no UI changes required.

## Goals

- **Primary**: Cost optimization through provider switching
- **Constraint**: Full tool calling parity between providers
- **Constraint**: No breaking changes to frontend or database

## Non-Goals

- Per-request provider selection
- Automatic fallback on provider errors
- User-facing provider toggle UI

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   /api/tutor/route.ts                   │
│                  (provider-agnostic)                    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   LLMProvider interface                 │
│  - chat(messages, options) → response                   │
│  - handles tool calling internally                      │
└─────────────────────────┬───────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│   ClaudeProvider      │   │   GeminiProvider      │
│   - Anthropic SDK     │   │   - Google AI SDK     │
│   - Claude format     │   │   - Gemini format     │
└───────────────────────┘   └───────────────────────┘
```

## Interface Design

### Core Types

```typescript
// src/lib/llm/types.ts

/** Provider-agnostic message format */
export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Tool definition (provider-agnostic) */
export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;  // JSON Schema
}

/** Tool call from the model */
export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
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

/** Consistent error class */
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
}
```

### Provider Factory

```typescript
// src/lib/llm/provider.ts

import type { LLMProvider, ProviderName } from './types';
import { claudeProvider } from './providers/claude';
import { geminiProvider } from './providers/gemini';

const providers: Record<ProviderName, LLMProvider> = {
  claude: claudeProvider,
  gemini: geminiProvider,
};

let cachedProvider: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const name = (process.env.LLM_PROVIDER || 'claude') as ProviderName;

  if (!providers[name]) {
    throw new Error(
      `Unknown LLM provider: ${name}. Valid options: ${Object.keys(providers).join(', ')}`
    );
  }

  // Validate required env vars
  if (name === 'claude' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY required when LLM_PROVIDER=claude');
  }
  if (name === 'gemini' && !process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY required when LLM_PROVIDER=gemini');
  }

  cachedProvider = providers[name];
  return cachedProvider;
}

export function getProviderName(): ProviderName {
  return (process.env.LLM_PROVIDER || 'claude') as ProviderName;
}
```

### Tool Definitions

```typescript
// src/lib/llm/tools.ts

import type { LLMTool } from './types';

export const TUTOR_TOOLS: LLMTool[] = [
  {
    name: 'get_study_progress',
    description:
      "Get the student's current study progress including mastery scores, weak areas, and exam readiness. " +
      'Call this when the user asks about their progress, what to study next, how they are doing, ' +
      'their weak areas, or whether they are ready for the exam.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

export type TutorToolName = 'get_study_progress';
```

## Provider Implementations

### Claude Provider

```typescript
// src/lib/llm/providers/claude.ts

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type { LLMProvider, LLMMessage, LLMChatOptions, LLMChatResponse, LLMToolCall, LLMToolResult, LLMTool } from '../types';
import { LLMError } from '../types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

function toClaudeMessages(messages: LLMMessage[]): MessageParam[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

function toClaudeTool(tool: LLMTool): Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Tool['input_schema'],
  };
}

function toClaudeToolUseBlock(call: LLMToolCall): ToolUseBlock {
  return {
    type: 'tool_use',
    id: call.id,
    name: call.name,
    input: call.arguments,
  };
}

function toClaudeToolResultBlock(result: LLMToolResult): ToolResultBlockParam {
  return {
    type: 'tool_result',
    tool_use_id: result.toolCallId,
    content: result.result,
    is_error: result.isError,
  };
}

function parseClaudeResponse(response: Anthropic.Message): LLMChatResponse {
  if (response.stop_reason === 'tool_use') {
    const toolCalls = response.content
      .filter((block): block is ToolUseBlock => block.type === 'tool_use')
      .map(block => ({
        id: block.id,
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      }));
    return { type: 'tool_calls', calls: toolCalls };
  }

  const textBlock = response.content.find(block => block.type === 'text');
  const content = textBlock?.type === 'text' ? textBlock.text : '';
  return { type: 'text', content };
}

export const claudeProvider: LLMProvider = {
  async chat(messages, options) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: options.maxTokens || 2048,
        system: options.systemPrompt,
        messages: toClaudeMessages(messages),
        tools: options.tools?.map(toClaudeTool),
      });
      return parseClaudeResponse(response);
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429) {
        throw new LLMError('Rate limit exceeded', 'claude', 429, true);
      }
      if (err.status === 401) {
        throw new LLMError('Invalid API key', 'claude', 401, false);
      }
      throw new LLMError(err.message || 'Unknown error', 'claude', err.status, false);
    }
  },

  async continueWithToolResults(messages, toolCalls, toolResults, options) {
    try {
      const claudeMessages: MessageParam[] = [
        ...toClaudeMessages(messages),
        { role: 'assistant', content: toolCalls.map(toClaudeToolUseBlock) },
        { role: 'user', content: toolResults.map(toClaudeToolResultBlock) },
      ];

      const response = await client.messages.create({
        model,
        max_tokens: options.maxTokens || 2048,
        system: options.systemPrompt,
        messages: claudeMessages,
        tools: options.tools?.map(toClaudeTool),
      });
      return parseClaudeResponse(response);
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429) {
        throw new LLMError('Rate limit exceeded', 'claude', 429, true);
      }
      if (err.status === 401) {
        throw new LLMError('Invalid API key', 'claude', 401, false);
      }
      throw new LLMError(err.message || 'Unknown error', 'claude', err.status, false);
    }
  },
};
```

### Gemini Provider

```typescript
// src/lib/llm/providers/gemini.ts

import { GoogleGenerativeAI, type FunctionDeclaration, type Part, type Content } from '@google/generative-ai';
import type { LLMProvider, LLMMessage, LLMChatOptions, LLMChatResponse, LLMToolCall, LLMToolResult, LLMTool } from '../types';
import { LLMError } from '../types';

const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const modelName = process.env.GEMINI_MODEL || 'gemini-3.0-flash';

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
    parameters: tool.parameters,
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

function toGeminiFunctionResponsePart(result: LLMToolResult): Part {
  return {
    functionResponse: {
      name: result.toolCallId,  // Gemini uses name, we store the call ID
      response: { result: result.result, isError: result.isError },
    },
  };
}

function parseGeminiResponse(response: unknown): LLMChatResponse {
  const resp = response as { candidates?: Array<{ content?: { parts?: Part[] } }> };
  const parts = resp.candidates?.[0]?.content?.parts || [];

  const functionCalls = parts.filter(p => 'functionCall' in p && p.functionCall);
  if (functionCalls.length > 0) {
    return {
      type: 'tool_calls',
      calls: functionCalls.map(p => {
        const fc = (p as { functionCall: { name: string; args: Record<string, unknown> } }).functionCall;
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
    try {
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
  },

  async continueWithToolResults(messages, toolCalls, toolResults, options) {
    try {
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

      const result = await chat.sendMessage(toolResults.map(toGeminiFunctionResponsePart));
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
  },
};
```

## Route Changes

The tutor route becomes provider-agnostic:

```typescript
// src/app/api/tutor/route.ts (key changes)

import { getProvider } from '@/lib/llm/provider';
import { TUTOR_TOOLS } from '@/lib/llm/tools';
import { LLMError } from '@/lib/llm/types';
import type { LLMMessage } from '@/lib/llm/types';

// Remove Anthropic SDK imports

export async function POST(request: NextRequest) {
  try {
    // ... validation unchanged ...

    const provider = getProvider();

    // Convert conversation to LLMMessage format
    const llmMessages: LLMMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Call provider
    let response = await provider.chat(llmMessages, {
      systemPrompt,
      tools: TUTOR_TOOLS,
      maxTokens: 2048,
    });

    // Tool loop
    let iterations = 0;
    const maxIterations = 5;

    while (response.type === 'tool_calls' && iterations < maxIterations) {
      iterations++;

      const toolResults = response.calls.map(call => {
        if (call.name === 'get_study_progress') {
          return {
            toolCallId: call.id,
            result: getTutorProgressContext(examId),
          };
        }
        return {
          toolCallId: call.id,
          result: 'Unknown tool',
          isError: true,
        };
      });

      response = await provider.continueWithToolResults(
        llmMessages,
        response.calls,
        toolResults,
        { systemPrompt, tools: TUTOR_TOOLS, maxTokens: 2048 }
      );
    }

    const assistantMessage = response.type === 'text'
      ? response.content
      : 'I was unable to complete the response.';

    // ... rest unchanged ...

  } catch (error) {
    if (error instanceof LLMError) {
      console.error(`LLM error (${error.provider}):`, error.message);
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: error.statusCode || 500 }
      );
    }
    // ... generic error handling ...
  }
}
```

## Environment Configuration

```bash
# .env.local

# LLM Provider Selection
LLM_PROVIDER=claude                       # 'claude' or 'gemini'

# Claude Configuration (required if LLM_PROVIDER=claude)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514     # Optional, this is the default

# Gemini Configuration (required if LLM_PROVIDER=gemini)
GOOGLE_AI_API_KEY=...
GEMINI_MODEL=gemini-3.0-flash             # Optional, this is the default

# Available Gemini models:
# - gemini-2.0-flash
# - gemini-2.0-pro
# - gemini-3.0-flash (default)
# - gemini-3.0-pro
```

## File Structure

### New Files

```
src/lib/llm/
├── types.ts                    # Interface definitions, LLMError class
├── provider.ts                 # Factory function (getProvider, getProviderName)
├── tools.ts                    # Provider-agnostic tool definitions
├── __tests__/
│   ├── provider.test.ts        # Factory tests
│   ├── tools.test.ts           # Tool definition tests
│   └── types.test.ts           # LLMError tests
└── providers/
    ├── claude.ts               # Claude implementation
    ├── gemini.ts               # Gemini implementation
    └── __tests__/
        ├── claude.test.ts      # Claude provider tests
        └── gemini.test.ts      # Gemini provider tests
```

### Modified Files

- `src/app/api/tutor/route.ts` - Use new interface
- `.env.local` - New environment variables
- `package.json` - Add `@google/generative-ai` dependency

### Deleted Files (after migration)

- `src/lib/claude/client.ts` - Moved to providers/claude.ts
- `src/lib/claude/tools.ts` - Moved to llm/tools.ts

### Unchanged Files

- `src/lib/claude/prompts.ts` - Prompts are provider-agnostic

## Testing Strategy

### Unit Tests

#### 1. Types and Error Classes (`src/lib/llm/__tests__/types.test.ts`)

```typescript
describe('LLMError', () => {
  it('creates error with all properties', () => {
    const error = new LLMError('Rate limit', 'claude', 429, true);
    expect(error.message).toBe('Rate limit');
    expect(error.provider).toBe('claude');
    expect(error.statusCode).toBe(429);
    expect(error.isRetryable).toBe(true);
    expect(error.name).toBe('LLMError');
  });

  it('defaults isRetryable to false', () => {
    const error = new LLMError('Error', 'gemini', 500);
    expect(error.isRetryable).toBe(false);
  });

  it('is instanceof Error', () => {
    const error = new LLMError('Error', 'claude');
    expect(error).toBeInstanceOf(Error);
  });
});
```

#### 2. Provider Factory (`src/lib/llm/__tests__/provider.test.ts`)

```typescript
describe('getProvider', () => {
  beforeEach(() => {
    // Reset cached provider between tests
    vi.resetModules();
  });

  it('returns claude provider by default', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    delete process.env.LLM_PROVIDER;
    const provider = getProvider();
    expect(provider).toBeDefined();
  });

  it('throws on missing ANTHROPIC_API_KEY for claude', () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.LLM_PROVIDER = 'claude';
    expect(() => getProvider()).toThrow('ANTHROPIC_API_KEY required');
  });

  it('throws on missing GOOGLE_AI_API_KEY for gemini', () => {
    delete process.env.GOOGLE_AI_API_KEY;
    process.env.LLM_PROVIDER = 'gemini';
    expect(() => getProvider()).toThrow('GOOGLE_AI_API_KEY required');
  });

  it('throws on unknown provider', () => {
    process.env.LLM_PROVIDER = 'unknown';
    expect(() => getProvider()).toThrow('Unknown LLM provider: unknown');
  });

  it('caches provider instance', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.LLM_PROVIDER = 'claude';
    const first = getProvider();
    const second = getProvider();
    expect(first).toBe(second);
  });
});

describe('getProviderName', () => {
  it('returns claude by default', () => {
    delete process.env.LLM_PROVIDER;
    expect(getProviderName()).toBe('claude');
  });

  it('returns configured provider', () => {
    process.env.LLM_PROVIDER = 'gemini';
    expect(getProviderName()).toBe('gemini');
  });
});
```

#### 3. Tool Definitions (`src/lib/llm/__tests__/tools.test.ts`)

```typescript
describe('TUTOR_TOOLS', () => {
  it('exports array of tools', () => {
    expect(Array.isArray(TUTOR_TOOLS)).toBe(true);
    expect(TUTOR_TOOLS.length).toBeGreaterThan(0);
  });

  it('has get_study_progress tool', () => {
    const tool = TUTOR_TOOLS.find(t => t.name === 'get_study_progress');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('progress');
    expect(tool?.parameters).toEqual({
      type: 'object',
      properties: {},
      required: [],
    });
  });

  it('all tools have required properties', () => {
    for (const tool of TUTOR_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
    }
  });
});
```

#### 4. Claude Provider (`src/lib/llm/providers/__tests__/claude.test.ts`)

```typescript
import { vi } from 'vitest';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

describe('claudeProvider', () => {
  describe('chat', () => {
    it('converts messages to Claude format', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello!' }],
      });
      // ... setup mock

      const response = await claudeProvider.chat(
        [{ role: 'user', content: 'Hi' }],
        { systemPrompt: 'You are helpful', maxTokens: 100 }
      );

      expect(response).toEqual({ type: 'text', content: 'Hello!' });
    });

    it('handles tool_use stop reason', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        stop_reason: 'tool_use',
        content: [{
          type: 'tool_use',
          id: 'call-123',
          name: 'get_study_progress',
          input: {},
        }],
      });
      // ... setup mock

      const response = await claudeProvider.chat(
        [{ role: 'user', content: 'How am I doing?' }],
        { systemPrompt: 'You are helpful', tools: TUTOR_TOOLS }
      );

      expect(response.type).toBe('tool_calls');
      expect(response.calls).toHaveLength(1);
      expect(response.calls[0].name).toBe('get_study_progress');
    });

    it('wraps rate limit errors', async () => {
      const mockCreate = vi.fn().mockRejectedValue({ status: 429 });
      // ... setup mock

      await expect(claudeProvider.chat([], { systemPrompt: '' }))
        .rejects.toThrow(LLMError);
    });
  });

  describe('continueWithToolResults', () => {
    it('includes tool results in message history', async () => {
      // ... test tool result continuation
    });
  });
});
```

#### 5. Gemini Provider (`src/lib/llm/providers/__tests__/gemini.test.ts`)

```typescript
import { vi } from 'vitest';

// Mock Google AI SDK
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      startChat: vi.fn().mockReturnValue({
        sendMessage: vi.fn(),
      }),
    }),
  })),
}));

describe('geminiProvider', () => {
  describe('chat', () => {
    it('converts messages to Gemini format', async () => {
      // ... test message conversion
    });

    it('handles function call responses', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                functionCall: {
                  name: 'get_study_progress',
                  args: {},
                },
              }],
            },
          }],
        },
      });
      // ... setup mock

      const response = await geminiProvider.chat(
        [{ role: 'user', content: 'How am I doing?' }],
        { systemPrompt: 'You are helpful', tools: TUTOR_TOOLS }
      );

      expect(response.type).toBe('tool_calls');
    });

    it('generates UUIDs for tool call IDs', async () => {
      // Gemini does not provide IDs, verify we generate them
    });
  });

  describe('continueWithToolResults', () => {
    it('sends function responses correctly', async () => {
      // ... test tool result format
    });
  });
});
```

### Integration Tests

#### Tutor Route (`src/app/api/tutor/__tests__/route.test.ts`)

```typescript
describe('POST /api/tutor', () => {
  beforeEach(() => {
    // Mock getProvider to return a test provider
  });

  it('returns response from provider', async () => {
    // ... test basic request/response
  });

  it('executes tool loop correctly', async () => {
    // Mock provider to return tool_calls, then text
    // Verify getTutorProgressContext is called
  });

  it('handles LLMError with correct status', async () => {
    // Mock provider to throw LLMError
    // Verify response has correct status code
  });

  it('limits tool loop iterations', async () => {
    // Mock provider to always return tool_calls
    // Verify loop stops at max iterations
  });
});
```

### Test Coverage Requirements

| File | Minimum Coverage |
|------|------------------|
| `src/lib/llm/types.ts` | 100% |
| `src/lib/llm/provider.ts` | 100% |
| `src/lib/llm/tools.ts` | 100% |
| `src/lib/llm/providers/claude.ts` | 90% |
| `src/lib/llm/providers/gemini.ts` | 90% |
| `src/app/api/tutor/route.ts` | 80% |

### Manual Testing Checklist

Before merging, manually verify:

- [ ] Claude provider works with `LLM_PROVIDER=claude`
- [ ] Gemini provider works with `LLM_PROVIDER=gemini`
- [ ] Tool calling works with Claude (ask "how am I doing?")
- [ ] Tool calling works with Gemini (ask "how am I doing?")
- [ ] Error displayed correctly when API key missing
- [ ] Error displayed correctly on rate limit
- [ ] Conversation history preserved across messages
- [ ] Different Gemini models work (`GEMINI_MODEL=gemini-3.0-pro`)

## Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0"
  }
}
```

## Migration Steps

1. Create `src/lib/llm/` directory structure
2. Implement types and tools (no behavior change)
3. Implement Claude provider (extract from existing code)
4. Update route to use new interface (behavior preserved)
5. Add and run tests for Claude path
6. Implement Gemini provider
7. Add and run tests for Gemini path
8. Delete old `src/lib/claude/client.ts` and `src/lib/claude/tools.ts`
9. Update documentation

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Gemini API differences cause bugs | Comprehensive mocking in tests, manual verification |
| Tool calling behavior differs subtly | Test with real APIs before merge |
| Breaking existing Claude functionality | Claude path tested first, route changes minimal |
| Google AI SDK version changes | Pin dependency version, test on upgrade |

## Future Considerations

Not in scope, but possible future enhancements:

- Per-request provider selection via request header
- Automatic fallback on provider errors
- Cost tracking and reporting
- Additional providers (OpenAI, Mistral, etc.)

---

## Implementation Progress

### Session 1: 2026-01-22

**Status:** Implementation complete, pending code review and manual testing.

**Completed steps:**

1. Created `src/lib/llm/` directory structure with:
   - `types.ts` - LLMMessage, LLMTool, LLMToolCall, LLMToolResult, LLMChatOptions, LLMChatResponse, LLMProvider interface, LLMError class
   - `retry.ts` - withRetry utility with exponential backoff
   - `tools.ts` - Provider-agnostic TUTOR_TOOLS definition
   - `prompts.ts` - Copied from src/lib/claude/prompts.ts (unchanged)
   - `provider.ts` - Factory with getProvider, getProviderName, resetProvider
   - `index.ts` - Barrel export for easy imports
   - `providers/claude.ts` - Claude provider implementation
   - `providers/gemini.ts` - Gemini provider implementation

2. Added @google/generative-ai dependency (v0.24.1)

3. Updated `src/app/api/tutor/route.ts` to use new LLM interface

4. Updated client-side imports:
   - `src/components/tutor/TutorPanel.tsx`
   - `src/contexts/TutorContext.tsx`
   - `src/hooks/useTutor.ts`

5. Deleted old `src/lib/claude/` directory

6. Added unit tests:
   - `src/lib/llm/__tests__/types.test.ts` (4 tests)
   - `src/lib/llm/__tests__/retry.test.ts` (8 tests)
   - `src/lib/llm/__tests__/tools.test.ts` (4 tests)
   - `src/lib/llm/__tests__/provider.test.ts` (9 tests)
   - `src/lib/llm/providers/__tests__/claude.test.ts` (10 tests) - added after code review
   - `src/lib/llm/providers/__tests__/gemini.test.ts` (13 tests) - added after code review

7. Fixed Gemini tool result mapping bug (code review feedback):
   - Now throws `LLMError` if tool call ID not found instead of falling back to index

**Test results:** 136 tests passing (88 existing + 48 new)

**TypeScript:** Compiles without errors

**Notes:**
- Changed default Gemini model from `gemini-3.0-flash` (in design) to `gemini-2.0-flash` (current latest)
- FunctionDeclarationSchema type cast needed for Gemini SDK type compatibility
- Provider implementations create fresh SDK clients on each call (no global client caching)
- Prompts moved from `src/lib/claude/` to `src/lib/llm/` (plan mentioned preserving but moving is correct)

**Code review completed:** All critical and important issues addressed.

**Remaining work:**
- Manual testing with both Claude and Gemini providers
- Update .env.example with new variables (if one exists)
