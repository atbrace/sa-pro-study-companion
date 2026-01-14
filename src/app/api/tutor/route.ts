import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude/client";
import { buildTutorSystemPrompt, buildContextPrompt, generateSuggestedQuestions, type TutorContext } from "@/lib/claude/prompts";
import { TUTOR_TOOLS, type TutorToolName } from "@/lib/claude/tools";
import { serializeIndexForPrompt } from "@/lib/content/index";
import { getExamById } from "@/lib/content/exam-loader";
import { getTutorProgressContext } from "@/lib/progress/tutor-context";
import { db } from "@/lib/db/client";
import type { MessageParam, ContentBlock, ToolUseBlock, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";

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

export async function POST(request: NextRequest) {
  try {
    const body: TutorRequest = await request.json();
    const { message, examId: requestExamId, context, conversationId } = body;
    const examId = requestExamId || 'sap-c02';
    const examConfig = getExamById(examId);

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

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
        messages = JSON.parse(conversation.messages_json);
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

    // Build API messages from conversation history
    let apiMessages: MessageParam[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Call Claude API with tool support, looping until we get a final text response
    let assistantMessage = '';
    const maxToolIterations = 5;
    let iterations = 0;

    while (iterations < maxToolIterations) {
      iterations++;

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: apiMessages,
        tools: TUTOR_TOOLS,
      });

      // Check if we need to handle tool use
      if (response.stop_reason === 'tool_use') {
        // Find tool use blocks
        const toolUseBlocks = response.content.filter(
          (block): block is ToolUseBlock => block.type === 'tool_use'
        );

        // Add assistant's response (including tool use) to messages
        apiMessages.push({
          role: 'assistant',
          content: response.content,
        });

        // Process each tool call and build tool results
        const toolResults: ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          const toolName = toolUse.name as TutorToolName;

          if (toolName === 'get_study_progress') {
            const progressContext = getTutorProgressContext(examId);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: progressContext,
            });
          } else {
            // Unknown tool
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: 'Unknown tool',
              is_error: true,
            });
          }
        }

        // Add tool results to messages
        apiMessages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue loop to get Claude's response with tool results
        continue;
      }

      // Got a final response (end_turn or max_tokens)
      const textBlock = response.content.find(
        (block): block is ContentBlock & { type: 'text' } => block.type === 'text'
      );

      assistantMessage = textBlock?.text || 'I apologize, but I encountered an error processing your request.';
      break;
    }

    if (!assistantMessage) {
      assistantMessage = 'I apologize, but I was unable to complete the response.';
    }

    // Add assistant response to conversation
    messages.push({
      role: 'assistant',
      content: assistantMessage,
    });

    // Save conversation to database
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

    // Generate suggested questions
    const suggestedQuestions = generateSuggestedQuestions(context || {});

    return NextResponse.json({
      conversationId: dbConversationId,
      response: assistantMessage,
      suggestedQuestions,
    } as TutorResponse);

  } catch (error) {
    console.error('Tutor API error:', error);
    return NextResponse.json(
      { error: 'Failed to process tutor request' },
      { status: 500 }
    );
  }
}
