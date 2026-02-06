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

export async function POST(request: NextRequest) {
  try {
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

    // Build conversation history
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
          console.error('Failed to parse conversation messages:', parseError);
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

    // Build system prompt with context and navigation index
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

    // Get provider and call API with tool support
    const provider = getProvider();
    const chatOptions = {
      systemPrompt,
      tools: TUTOR_TOOLS,
      maxTokens: 2048,
    };

    let response = await provider.chat(llmMessages, chatOptions);

    // Tool loop - continue until we get a final text response
    const maxToolIterations = 5;
    let iterations = 0;
    let lastToolCalls: LLMToolCall[] = [];

    while (response.type === 'tool_calls' && iterations < maxToolIterations) {
      iterations++;
      lastToolCalls = response.calls;

      // Execute all tool calls
      const toolResults: LLMToolResult[] = response.calls.map(call =>
        executeTool(call, examId)
      );

      // Continue with tool results
      response = await provider.continueWithToolResults(
        llmMessages,
        lastToolCalls,
        toolResults,
        chatOptions
      );
    }

    // Handle tool iteration limit reached
    if (response.type === 'tool_calls') {
      console.warn(
        `Tool iteration limit (${maxToolIterations}) reached. Last tool calls:`,
        lastToolCalls.map(tc => tc.name)
      );
      // Return a user-friendly message instead of exposing internal state
      return NextResponse.json({
        conversationId: conversationId || 'unsaved',
        response: 'I encountered an issue while processing your request. Please try rephrasing your question or asking something simpler.',
        suggestedQuestions: generateSuggestedQuestions(context || {}),
        warning: 'Response generation limit reached',
      } as TutorResponse & { warning?: string });
    }

    const assistantMessage = response.content;

    // Add assistant response to conversation
    messages.push({
      role: 'assistant',
      content: assistantMessage,
    });

    // Save conversation to database
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
      console.error('Database error saving conversation:', dbError);
      // Return the response anyway - the AI response was successful, just couldn't persist
      // Better UX to show the response than to fail completely
      return NextResponse.json({
        conversationId: dbConversationId || 'unsaved',
        response: assistantMessage,
        suggestedQuestions: generateSuggestedQuestions(context || {}),
        warning: 'Conversation could not be saved',
      } as TutorResponse & { warning?: string });
    }

    // Generate suggested questions
    const suggestedQuestions = generateSuggestedQuestions(context || {});

    return NextResponse.json({
      conversationId: dbConversationId,
      response: assistantMessage,
      suggestedQuestions,
    } as TutorResponse);

  } catch (error) {
    if (error instanceof LLMError) {
      console.error(`LLM error (${error.provider}):`, error.message, error.statusCode);
      // Return generic message to client, don't expose internal details
      const clientMessage = error.statusCode === 429
        ? 'AI service is busy. Please try again in a moment.'
        : 'The AI service is temporarily unavailable. Please try again.';
      return NextResponse.json(
        { error: clientMessage },
        { status: error.statusCode || 503 }
      );
    }

    console.error('Tutor API error:', error);
    return NextResponse.json(
      { error: 'Failed to process tutor request' },
      { status: 500 }
    );
  }
}
