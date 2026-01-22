import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  Tool,
  ToolUseBlock,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
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

function createClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getModel(): string {
  return process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
}

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
    return withRetry(async () => {
      try {
        const client = createClient();
        const model = getModel();
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
    });
  },

  async continueWithToolResults(messages, toolCalls, toolResults, options) {
    return withRetry(async () => {
      try {
        const client = createClient();
        const model = getModel();
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
    });
  },
};
