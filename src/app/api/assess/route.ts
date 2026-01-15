import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { createAssessmentResult } from '@/lib/assess/engine';
import { getRandomDomainQuestions, getTopicQuestions } from '@/lib/content/loader';
import type { AssessmentSubmission, QuestionAnswer } from '@/types/assessment';

/**
 * Validate that an answer object has required fields
 */
function isValidAnswer(answer: unknown): answer is QuestionAnswer {
  if (!answer || typeof answer !== 'object') return false;
  const a = answer as Record<string, unknown>;
  return (
    typeof a.questionId === 'string' &&
    a.questionId.length > 0 &&
    (typeof a.selectedAnswer === 'string' || Array.isArray(a.selectedAnswer))
  );
}

/**
 * Validate request body structure
 */
function validateAssessmentBody(body: unknown): { valid: true; data: AssessmentSubmission } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const b = body as Record<string, unknown>;

  // Validate answers array
  if (!Array.isArray(b.answers) || b.answers.length === 0) {
    return { valid: false, error: 'No answers provided' };
  }

  // Validate each answer has required fields
  for (let i = 0; i < b.answers.length; i++) {
    if (!isValidAnswer(b.answers[i])) {
      return { valid: false, error: `Invalid answer at index ${i}: must have questionId and selectedAnswer` };
    }
  }

  // Validate mode if provided
  if (b.mode !== undefined && b.mode !== 'timed' && b.mode !== 'relaxed') {
    return { valid: false, error: 'Invalid mode: must be "timed" or "relaxed"' };
  }

  return { valid: true, data: body as AssessmentSubmission };
}

/**
 * POST /api/assess - Submit assessment answers
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // Validate request body structure
    const validation = validateAssessmentBody(rawBody);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const body = validation.data;
    const examId = body.examId || 'sap-c02';

    // Get questions for validation
    let questions;
    if (body.topicId && body.domainId) {
      questions = getTopicQuestions(examId, body.domainId, body.topicId);
    } else if (body.domainId) {
      questions = getRandomDomainQuestions(examId, body.domainId, 100); // Get all
    } else {
      return NextResponse.json(
        { error: 'Domain or topic ID required' },
        { status: 400 }
      );
    }

    // Filter to only questions that were answered
    const answeredQuestionIds = body.answers.map(a => a.questionId);
    const relevantQuestions = questions.filter(q => answeredQuestionIds.includes(q.id));

    if (relevantQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No matching questions found' },
        { status: 400 }
      );
    }

    // Create assessment result
    const result = createAssessmentResult(
      body.sessionId,
      relevantQuestions,
      body.answers
    );

    // Group results by topic for progress updates
    const topicGroups = new Map<string, { domainId: string; correct: number; total: number }>();
    for (const r of result.results) {
      const topicId = r.question.topicId;
      const domainId = r.question.domainId;
      if (!topicId || !domainId) continue;

      if (!topicGroups.has(topicId)) {
        topicGroups.set(topicId, { domainId, correct: 0, total: 0 });
      }
      const group = topicGroups.get(topicId)!;
      group.total++;
      if (r.isCorrect) group.correct++;
    }

    // Wrap all database operations in a transaction for atomicity
    const submitAssessment = db.transaction(() => {
      // Store assessment session in database
      const sessionResult = db.prepare(`
        INSERT INTO assessment_sessions (
          exam_id,
          domain_id,
          session_type,
          total_questions,
          correct_answers,
          score_percentage,
          time_taken_seconds,
          started_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' seconds'))
      `).run(
        examId,
        body.domainId || null,
        'initial',
        result.totalCount,
        result.correctCount,
        result.score,
        result.timeSeconds,
        result.timeSeconds
      );

      const sessionId = sessionResult.lastInsertRowid;

      // Store individual question attempts
      for (const answer of body.answers) {
        const questionResult = result.results.find(r => r.questionId === answer.questionId);
        if (!questionResult) continue;

        // Use question's metadata for domain/topic (more accurate than body params for domain-wide assessments)
        const questionDomainId = questionResult.question.domainId || body.domainId || '';
        const questionTopicId = questionResult.question.topicId || body.topicId || '';

        db.prepare(`
          INSERT INTO question_attempts (
            exam_id,
            question_id,
            domain_id,
            topic_id,
            selected_answer,
            is_correct,
            time_taken_seconds,
            mode
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          examId,
          answer.questionId,
          questionDomainId,
          questionTopicId,
          typeof answer.selectedAnswer === 'string'
            ? answer.selectedAnswer
            : JSON.stringify(answer.selectedAnswer),
          questionResult.isCorrect ? 1 : 0,
          answer.timeSeconds,
          body.mode
        );
      }

      // Update topic progress
      for (const [topicId, { domainId, correct, total }] of topicGroups.entries()) {
        db.prepare(`
          INSERT INTO topic_progress (
            exam_id,
            domain_id,
            topic_id,
            questions_attempted,
            questions_correct,
            mastery_level,
            last_studied_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(exam_id, domain_id, topic_id) DO UPDATE SET
            questions_attempted = questions_attempted + excluded.questions_attempted,
            questions_correct = questions_correct + excluded.questions_correct,
            mastery_level = CAST(questions_correct + excluded.questions_correct AS REAL) /
                           (questions_attempted + excluded.questions_attempted),
            last_studied_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `).run(examId, domainId, topicId, total, correct, correct / total);
      }

      // Store weak areas (topics where user performed below threshold)
      for (const weakArea of result.weakAreas) {
        db.prepare(`
          INSERT INTO weak_areas (exam_id, domain_id, topic_id, identified_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(exam_id, domain_id, topic_id) DO UPDATE SET
            last_attempt_at = CURRENT_TIMESTAMP,
            attempts_since_identification = attempts_since_identification + 1
        `).run(examId, weakArea.domainId, weakArea.topicId);
      }

      // Auto-resolve weak areas: if topic mastery is now >= 80%, mark as resolved
      for (const [topicId, { domainId }] of topicGroups.entries()) {
        const progress = db.prepare(`
          SELECT mastery_level FROM topic_progress
          WHERE exam_id = ? AND domain_id = ? AND topic_id = ?
        `).get(examId, domainId, topicId) as { mastery_level: number } | undefined;

        if (progress && progress.mastery_level >= 0.8) {
          db.prepare(`
            UPDATE weak_areas
            SET resolved = 1
            WHERE exam_id = ? AND domain_id = ? AND topic_id = ? AND resolved = 0
          `).run(examId, domainId, topicId);
        }
      }

      return sessionId;
    });

    // Execute the transaction
    const sessionId = submitAssessment();

    return NextResponse.json({
      ...result,
      databaseSessionId: sessionId,
    });
  } catch (error) {
    console.error('Assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to process assessment' },
      { status: 500 }
    );
  }
}
