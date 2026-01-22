/**
 * System prompts for the AI tutor
 */

import type { ExamConfig } from '@/types/exam';

/**
 * Build the tutor system prompt from exam configuration
 * The exam-specific tutor prompt is stored in the exam.yaml file
 */
export function buildTutorSystemPrompt(examConfig: ExamConfig): string {
  return examConfig.tutorPrompt;
}

/**
 * Default tutor prompt for when no exam config is available
 * This is a fallback and should rarely be used
 */
export const DEFAULT_TUTOR_PROMPT = `You are an expert AWS certification tutor. Your role is to help students prepare for their certification exam by:

1. **Explaining concepts clearly**: Break down complex AWS services and architectural patterns into understandable explanations
2. **Providing exam-focused guidance**: Focus on what's important for the exam
3. **Linking to official resources**: Reference AWS documentation, whitepapers, and FAQs when relevant
4. **Encouraging hands-on practice**: Suggest practical experiments and real-world scenarios
5. **Identifying knowledge gaps**: Help students understand where they need more study

## Response Guidelines
- Keep responses concise but comprehensive
- Use bullet points and clear structure
- Always cite AWS documentation when making technical claims
- For incorrect answers, explain WHY the answer is wrong and what the correct approach is
- Suggest related topics to study for deeper understanding
- When discussing services, mention use cases and limitations

## Tone
- Supportive and encouraging
- Professional but approachable
- Focus on learning, not just memorization
- Celebrate progress and provide constructive feedback`;

export interface TutorContext {
  examId?: string;
  domainId?: string;
  domainName?: string;
  topicId?: string;
  topicName?: string;
  questionId?: string;
  questionText?: string;
  currentContent?: string;
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  // Lab context
  labId?: string;
  labName?: string;
}

/**
 * Generate context-aware system prompt based on current user location
 */
export function buildContextPrompt(context: TutorContext): string {
  const parts: string[] = [];

  // Lab context takes precedence if present
  if (context.labId && context.labName) {
    parts.push(`## Lab Context`);
    parts.push(`The student is working on a hands-on lab: **${context.labName}**`);
    parts.push(`They may have questions about the lab exercises, CDK infrastructure code, AWS services involved, or troubleshooting deployment issues.`);
    return parts.join('\n');
  }

  if (context.domainName) {
    parts.push(`## Current Context`);
    parts.push(`The student is currently studying: **${context.domainName}**`);
  }

  if (context.topicName) {
    parts.push(`Topic: **${context.topicName}**`);
  }

  if (context.questionText) {
    parts.push(`\n## Question Context`);
    parts.push(`The student is working on this question:`);
    parts.push(`"${context.questionText}"`);

    if (context.userAnswer && context.correctAnswer) {
      parts.push(`\nStudent's answer: ${context.userAnswer}`);
      parts.push(`Correct answer: ${context.correctAnswer}`);
      parts.push(`Result: ${context.isCorrect ? 'Correct' : 'Incorrect'}`);
    }
  }

  if (context.currentContent) {
    parts.push(`\n## Study Material`);
    parts.push(`Current content being studied:`);
    parts.push(context.currentContent.substring(0, 500) + '...');
  }

  return parts.join('\n');
}

/**
 * Generate suggested follow-up questions based on context
 */
export function generateSuggestedQuestions(context: TutorContext): string[] {
  const suggestions: string[] = [];

  // Lab-specific suggestions
  if (context.labId && context.labName) {
    suggestions.push("What AWS services does this lab use?");
    suggestions.push("How do I troubleshoot deployment errors?");
    suggestions.push("What exam topics does this lab cover?");
    suggestions.push("How can I extend this lab to learn more?");
    return suggestions.slice(0, 4);
  }

  if (context.questionText && !context.isCorrect) {
    suggestions.push("Why did I get this wrong?");
    suggestions.push("What should I study to avoid this mistake?");
  }

  if (context.topicName) {
    suggestions.push(`What are the key exam topics for ${context.topicName}?`);
    suggestions.push("What are common exam traps in this area?");
  }

  if (context.domainName) {
    suggestions.push("What are the most important services for this domain?");
    suggestions.push("Can you suggest a hands-on lab to practice?");
  }

  // Generic helpful questions
  suggestions.push("What should I focus on next?");
  suggestions.push("How can I remember this better?");

  return suggestions.slice(0, 4); // Return top 4 suggestions
}
