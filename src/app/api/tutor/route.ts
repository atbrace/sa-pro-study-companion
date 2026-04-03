import { NextRequest, NextResponse } from "next/server";
import {
  getProvider,
  buildTutorSystemPrompt,
  buildContextPrompt,
  generateSuggestedQuestions,
  TUTOR_TOOLS,
  LLMError,
  type TutorContext,
  type LLMMessage,
  type LLMToolCall,
  type LLMToolResult,
} from "@/lib/llm";
import {
  handleGetStudyProgress,
  handleGetQuestionDetails,
  handleSearchStudyContent,
  handleGetTopicMetadata,
  handleGetAssessmentHistory,
  handleGetWeakAreaQuestions,
  handleSuggestNextStudyTopic,
} from "@/lib/llm/tool-handlers";
import { serializeIndexForPrompt } from "@/lib/content/index";
import { getExamById } from "@/lib/content/exam-loader";
import { db } from "@/lib/db/client";

// Cache navigation indices by exam (static content, doesn't change at runtime)
const cachedNavigationIndices: Map<string, string> = new Map();

function getNavigationIndex(examId: string): string {
  if (!cachedNavigationIndices.has(examId)) {
    cachedNavigationIndices.set(examId, serializeIndexForPrompt(examId));
  }
  return cachedNavigationIndices.get(examId)!;
}

export const runtime = 'nodejs';

const isDev = process.env.NODE_ENV === 'development';

type ErrorCategory =
  | 'validation'
  | 'conversation_corrupt'
  | 'llm_rate_limit'
  | 'llm_auth'
  | 'llm_provider'
  | 'llm_unknown'
  | 'db_save'
  | 'tool_limit'
  | 'internal';

function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof LLMError) {
    if (error.statusCode === 429) return 'llm_rate_limit';
    if (error.statusCode === 401) return 'llm_auth';
    if (error.statusCode) return 'llm_provider';
    return 'llm_unknown';
  }
  return 'internal';
}

class RequestTimer {
  private marks: Array<{ stage: string; durationMs: number }> = [];
  private stageStart = 0;
  private readonly requestStart = performance.now();

  startStage(): void {
    this.stageStart = performance.now();
  }

  endStage(stage: string): void {
    this.marks.push({ stage, durationMs: performance.now() - this.stageStart });
  }

  toServerTimingHeader(): string {
    const total = performance.now() - this.requestStart;
    return [...this.marks, { stage: 'total', durationMs: total }]
      .map(m => `${m.stage};dur=${m.durationMs.toFixed(1)}`)
      .join(', ');
  }

  logIfDev(): void {
    if (!isDev) return;
    const total = performance.now() - this.requestStart;
    const breakdown = this.marks
      .map(m => `  ${m.stage}: ${m.durationMs.toFixed(0)}ms`)
      .join('\n');
    console.log(`[tutor] ${total.toFixed(0)}ms total\n${breakdown}`);
  }

  getTimingsObject(): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const m of this.marks) {
      obj[m.stage] = Math.round(m.durationMs);
    }
    obj.total = Math.round(performance.now() - this.requestStart);
    return obj;
  }

  applyTo(response: Response): Response {
    this.logIfDev();
    response.headers.set('Server-Timing', this.toServerTimingHeader());
    return response;
  }
}

interface TutorRequest {
  message: string;
  examId?: string;
  context?: TutorContext;
  conversationId?: string;
}

interface TutorResponse {
  conversationId: string;
  response: string;
  suggestedQuestions: string[];
}

/**
 * Validate tutor request body
 */
function validateTutorBody(body: unknown): { valid: true; data: TutorRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const b = body as Record<string, unknown>;

  // Validate message
  if (typeof b.message !== 'string' || b.message.trim().length === 0) {
    return { valid: false, error: 'Message is required' };
  }

  // Validate examId if provided
  if (b.examId !== undefined && typeof b.examId !== 'string') {
    return { valid: false, error: 'Invalid exam ID format' };
  }

  // Validate conversationId if provided
  if (b.conversationId !== undefined && typeof b.conversationId !== 'string') {
    return { valid: false, error: 'Invalid conversation ID format' };
  }

  return { valid: true, data: body as TutorRequest };
}

type ToolHandler = (params: Record<string, unknown>, examId: string) => string;

const toolHandlers: Record<string, ToolHandler> = {
  get_study_progress: handleGetStudyProgress,
  get_question_details: handleGetQuestionDetails,
  search_study_content: handleSearchStudyContent,
  get_topic_metadata: handleGetTopicMetadata,
  get_assessment_history: handleGetAssessmentHistory,
  get_weak_area_questions: handleGetWeakAreaQuestions,
  suggest_next_study_topic: handleSuggestNextStudyTopic,
};

/**
 * Execute a tool call and return the result
 */
function executeTool(toolCall: LLMToolCall, examId: string): LLMToolResult {
  const handler = toolHandlers[toolCall.name];
  if (!handler) {
    return {
      toolCallId: toolCall.id,
      result: `Unknown tool: ${toolCall.name}`,
      isError: true,
    };
  }

  return {
    toolCallId: toolCall.id,
    result: handler(toolCall.arguments, examId),
  };
}

function getClientErrorMessage(error: LLMError): string {
  const providerLabel = error.provider === 'gemini' ? 'Gemini' : 'Claude';
  if (error.statusCode === 429) {
    return `${providerLabel} is rate-limited. Please wait a moment and try again.`;
  } else if (error.statusCode === 503 || error.statusCode === 529) {
    return `${providerLabel} is experiencing high demand. Your request was retried but the service is still busy. Please try again shortly.`;
  } else if (error.statusCode === 401) {
    return `${providerLabel} API key is invalid or missing. Check your .env.local configuration.`;
  }
  return `${providerLabel} returned an error (${error.statusCode || 'unknown'}). Please try again.`;
}

function handleStreamingResponse(
  provider: ReturnType<typeof getProvider>,
  llmMessages: LLMMessage[],
  chatOptions: { systemPrompt: string; tools: typeof TUTOR_TOOLS; maxTokens: number },
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  examId: string,
  dbConversationId: string | undefined,
  context: TutorContext | undefined,
  timer: RequestTimer,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      try {
        send('stream_start', { conversationId: dbConversationId || null });

        const maxToolIterations = 5;
        let iterations = 0;
        let lastToolCalls: LLMToolCall[] = [];
        let fullText = '';
        let toolCallsReceived = false;

        // First LLM call — streaming
        timer.startStage();
        if (!provider.chatStream) {
          // Fallback to non-streaming
          const response = await provider.chat(llmMessages, chatOptions);
          timer.endStage('llm_initial');
          if (response.type === 'tool_calls') {
            toolCallsReceived = true;
            lastToolCalls = response.calls;
          } else {
            fullText = response.content;
            send('text_delta', { delta: response.content });
          }
        } else {
          const gen = provider.chatStream(llmMessages, chatOptions);
          for await (const chunk of gen) {
            if (chunk.type === 'text_delta') {
              fullText += chunk.delta;
              send('text_delta', { delta: chunk.delta });
            } else if (chunk.type === 'tool_calls') {
              toolCallsReceived = true;
              lastToolCalls = chunk.calls;
            } else if (chunk.type === 'done') {
              fullText = chunk.fullText;
            }
          }
          timer.endStage('llm_initial');
        }

        // Tool loop
        while (toolCallsReceived && iterations < maxToolIterations) {
          iterations++;
          toolCallsReceived = false;
          fullText = '';

          for (const call of lastToolCalls) {
            send('tool_start', { toolName: call.name, toolIndex: iterations });
          }

          timer.startStage();
          const toolResults: LLMToolResult[] = lastToolCalls.map(call =>
            executeTool(call, examId)
          );
          timer.endStage(`tool_exec_${iterations}`);

          for (const call of lastToolCalls) {
            send('tool_end', { toolName: call.name, toolIndex: iterations });
          }

          // Continue — streaming if available
          timer.startStage();
          if (!provider.continueWithToolResultsStream) {
            const response = await provider.continueWithToolResults(
              llmMessages, lastToolCalls, toolResults, chatOptions
            );
            timer.endStage(`llm_continue_${iterations}`);
            if (response.type === 'tool_calls') {
              toolCallsReceived = true;
              lastToolCalls = response.calls;
            } else {
              fullText = response.content;
              send('text_delta', { delta: response.content });
            }
          } else {
            const gen = provider.continueWithToolResultsStream(
              llmMessages, lastToolCalls, toolResults, chatOptions
            );
            for await (const chunk of gen) {
              if (chunk.type === 'text_delta') {
                fullText += chunk.delta;
                send('text_delta', { delta: chunk.delta });
              } else if (chunk.type === 'tool_calls') {
                toolCallsReceived = true;
                lastToolCalls = chunk.calls;
              } else if (chunk.type === 'done') {
                fullText = chunk.fullText;
              }
            }
            timer.endStage(`llm_continue_${iterations}`);
          }
        }

        // Tool limit exceeded
        if (toolCallsReceived) {
          console.error('[tutor] error=tool_limit', { iterations, tools: lastToolCalls.map(tc => tc.name) });
          send('error', {
            error: 'I encountered an issue while processing your request. Please try rephrasing.',
            errorCategory: 'tool_limit',
          });
          controller.close();
          return;
        }

        // Save conversation
        messages.push({ role: 'assistant', content: fullText });
        timer.startStage();
        try {
          if (!dbConversationId) {
            const result = db.prepare(`
              INSERT INTO tutor_conversations (
                context_exam, context_domain, context_topic,
                context_question_id, context_lab_id, messages_json
              ) VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              examId,
              context?.domainId || null,
              context?.topicId || null,
              context?.questionId || null,
              context?.labId || null,
              JSON.stringify(messages)
            );
            dbConversationId = result.lastInsertRowid.toString();
          } else {
            db.prepare(`
              UPDATE tutor_conversations SET messages_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(JSON.stringify(messages), dbConversationId);
          }
        } catch (dbError) {
          console.error('[tutor] error=db_save', dbError);
        }
        timer.endStage('conversation_save');
        timer.logIfDev();

        send('stream_end', {
          conversationId: dbConversationId || 'unsaved',
          suggestedQuestions: generateSuggestedQuestions(context || {}),
          timings: timer.getTimingsObject(),
        });
        controller.close();
      } catch (error) {
        let category = categorizeError(error);
        let errorMessage: string;

        if (error instanceof LLMError) {
          errorMessage = getClientErrorMessage(error);
          console.error(`[tutor] error=${category} provider=${error.provider} status=${error.statusCode}`, error.message);
        } else {
          // Try to extract status from raw SDK errors (GoogleGenerativeAIFetchError, Anthropic.APIError)
          const rawStatus = (error as { status?: number })?.status;
          if (rawStatus === 429) {
            category = 'llm_rate_limit';
            errorMessage = 'AI service is rate-limited. Please wait a moment and try again.';
          } else if (rawStatus && rawStatus >= 500) {
            category = 'llm_provider';
            errorMessage = 'AI service is experiencing issues. Please try again shortly.';
          } else {
            errorMessage = 'Failed to process tutor request';
          }
          console.error(`[tutor] error=${category}`, error);
        }

        send('error', { error: errorMessage, errorCategory: category });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Server-Timing': timer.toServerTimingHeader(),
    },
  });
}

export async function POST(request: NextRequest) {
  const timer = new RequestTimer();

  try {
    timer.startStage();
    const rawBody = await request.json();

    // Validate request body structure
    const validation = validateTutorBody(rawBody);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const body = validation.data;
    const { message, examId: requestExamId, context, conversationId } = body;
    const examId = requestExamId || 'sap-c02';
    const examConfig = getExamById(examId);

    if (!examConfig) {
      return NextResponse.json(
        { error: 'Invalid exam ID' },
        { status: 400 }
      );
    }
    timer.endStage('parse');

    // Build conversation history
    timer.startStage();
    let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    let dbConversationId = conversationId;

    if (conversationId) {
      // Load existing conversation
      const conversation = db.prepare(`
        SELECT messages_json
        FROM tutor_conversations
        WHERE id = ?
      `).get(conversationId) as { messages_json: string } | undefined;

      if (conversation) {
        try {
          messages = JSON.parse(conversation.messages_json);
        } catch (parseError) {
          console.error('[tutor] error=conversation_corrupt', { conversationId });
          return NextResponse.json(
            { error: 'Conversation data corrupted. Please start a new conversation.' },
            { status: 422 }
          );
        }
      }
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message,
    });
    timer.endStage('conversation_load');

    // Build system prompt with context and navigation index
    timer.startStage();
    const contextPrompt = context ? buildContextPrompt(context) : '';
    const navigationIndex = getNavigationIndex(examId);
    const tutorSystemPrompt = buildTutorSystemPrompt(examConfig);
    const systemPrompt = [
      tutorSystemPrompt,
      navigationIndex,
      contextPrompt,
    ].filter(Boolean).join('\n\n');

    // Convert to LLM messages
    const llmMessages: LLMMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    timer.endStage('prompt_build');

    // Get provider and call API with tool support
    const provider = getProvider();
    const chatOptions = {
      systemPrompt,
      tools: TUTOR_TOOLS,
      maxTokens: 2048,
    };

    // Branch: streaming vs non-streaming based on Accept header
    const wantsStream = request.headers.get('accept')?.includes('text/event-stream');
    if (wantsStream) {
      return handleStreamingResponse(
        provider, llmMessages, chatOptions, messages,
        examId, dbConversationId, context, timer
      );
    }

    timer.startStage();
    let response = await provider.chat(llmMessages, chatOptions);
    timer.endStage('llm_initial');

    // Tool loop - continue until we get a final text response
    const maxToolIterations = 5;
    let iterations = 0;
    let lastToolCalls: LLMToolCall[] = [];

    while (response.type === 'tool_calls' && iterations < maxToolIterations) {
      iterations++;
      lastToolCalls = response.calls;

      timer.startStage();
      const toolResults: LLMToolResult[] = response.calls.map(call =>
        executeTool(call, examId)
      );
      timer.endStage(`tool_exec_${iterations}`);

      timer.startStage();
      response = await provider.continueWithToolResults(
        llmMessages,
        lastToolCalls,
        toolResults,
        chatOptions
      );
      timer.endStage(`llm_continue_${iterations}`);
    }

    // Handle tool iteration limit reached
    if (response.type === 'tool_calls') {
      console.error('[tutor] error=tool_limit', {
        iterations,
        tools: lastToolCalls.map(tc => tc.name),
      });
      return timer.applyTo(NextResponse.json({
        conversationId: conversationId || 'unsaved',
        response: 'I encountered an issue while processing your request. Please try rephrasing your question or asking something simpler.',
        suggestedQuestions: generateSuggestedQuestions(context || {}),
        warning: 'Response generation limit reached',
      } as TutorResponse & { warning?: string }));
    }

    const assistantMessage = response.content;

    // Add assistant response to conversation
    messages.push({
      role: 'assistant',
      content: assistantMessage,
    });

    // Save conversation to database
    timer.startStage();
    try {
      if (!dbConversationId) {
        const result = db.prepare(`
          INSERT INTO tutor_conversations (
            context_exam,
            context_domain,
            context_topic,
            context_question_id,
            context_lab_id,
            messages_json
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          examId,
          context?.domainId || null,
          context?.topicId || null,
          context?.questionId || null,
          context?.labId || null,
          JSON.stringify(messages)
        );

        dbConversationId = result.lastInsertRowid.toString();
      } else {
        db.prepare(`
          UPDATE tutor_conversations
          SET messages_json = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(messages), dbConversationId);
      }
    } catch (dbError) {
      timer.endStage('conversation_save');
      console.error('[tutor] error=db_save', dbError);
      return timer.applyTo(NextResponse.json({
        conversationId: dbConversationId || 'unsaved',
        response: assistantMessage,
        suggestedQuestions: generateSuggestedQuestions(context || {}),
        warning: 'Conversation could not be saved',
      } as TutorResponse & { warning?: string }));
    }
    timer.endStage('conversation_save');

    // Generate suggested questions
    const suggestedQuestions = generateSuggestedQuestions(context || {});

    return timer.applyTo(NextResponse.json({
      conversationId: dbConversationId,
      response: assistantMessage,
      suggestedQuestions,
    } as TutorResponse));

  } catch (error) {
    const category = categorizeError(error);

    if (error instanceof LLMError) {
      console.error(`[tutor] error=${category} provider=${error.provider} status=${error.statusCode}`, error.message);
      return timer.applyTo(NextResponse.json(
        { error: getClientErrorMessage(error), provider: error.provider, errorCategory: category },
        { status: error.statusCode || 503 }
      ));
    }

    console.error(`[tutor] error=${category}`, error);
    return timer.applyTo(NextResponse.json(
      { error: 'Failed to process tutor request' },
      { status: 500 }
    ));
  }
}
