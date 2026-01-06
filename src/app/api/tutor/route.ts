import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude/client";
import { TUTOR_SYSTEM_PROMPT, buildContextPrompt, generateSuggestedQuestions, type TutorContext } from "@/lib/claude/prompts";
import { db } from "@/lib/db/client";

export const runtime = 'nodejs';

interface TutorRequest {
  message: string;
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
    const { message, context, conversationId } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
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

    // Build system prompt with context
    const contextPrompt = context ? buildContextPrompt(context) : '';
    const systemPrompt = contextPrompt
      ? `${TUTOR_SYSTEM_PROMPT}\n\n${contextPrompt}`
      : TUTOR_SYSTEM_PROMPT;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I encountered an error processing your request.';

    // Add assistant response to conversation
    messages.push({
      role: 'assistant',
      content: assistantMessage,
    });

    // Save conversation to database
    if (!dbConversationId) {
      const result = db.prepare(`
        INSERT INTO tutor_conversations (
          context_domain,
          context_topic,
          context_question_id,
          messages_json
        ) VALUES (?, ?, ?, ?)
      `).run(
        context?.domainId || null,
        context?.topicId || null,
        context?.questionId || null,
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
