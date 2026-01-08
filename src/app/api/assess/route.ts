import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { createAssessmentResult } from '@/lib/assess/engine';
import { getRandomDomainQuestions, getTopicQuestions } from '@/lib/content/loader';
import type { AssessmentSubmission } from '@/types/assessment';

/**
 * POST /api/assess - Submit assessment answers
 */
export async function POST(request: NextRequest) {
  try {
    const body: AssessmentSubmission = await request.json();

    // Validate input
    if (!body.answers || body.answers.length === 0) {
      return NextResponse.json(
        { error: 'No answers provided' },
        { status: 400 }
      );
    }

    // Get questions for validation
    let questions;
    if (body.topicId && body.domainId) {
      questions = getTopicQuestions(body.domainId, body.topicId);
    } else if (body.domainId) {
      questions = getRandomDomainQuestions(body.domainId, 100); // Get all
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

    // Store assessment session in database
    const sessionResult = db.prepare(`
      INSERT INTO assessment_sessions (
        domain_id,
        session_type,
        total_questions,
        correct_answers,
        score_percentage,
        time_taken_seconds,
        started_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' seconds'))
    `).run(
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

      db.prepare(`
        INSERT INTO question_attempts (
          question_id,
          domain_id,
          topic_id,
          selected_answer,
          is_correct,
          time_taken_seconds,
          mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        answer.questionId,
        body.domainId || '',
        body.topicId || '',
        typeof answer.selectedAnswer === 'string'
          ? answer.selectedAnswer
          : JSON.stringify(answer.selectedAnswer),
        questionResult.isCorrect ? 1 : 0,
        answer.timeSeconds,
        body.mode
      );
    }

    // Update topic progress
    if (body.topicId && body.domainId) {
      const topicResults = result.results;
      const topicCorrect = topicResults.filter(r => r.isCorrect).length;

      db.prepare(`
        INSERT INTO topic_progress (
          domain_id,
          topic_id,
          questions_attempted,
          questions_correct,
          mastery_level,
          last_studied_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(domain_id, topic_id) DO UPDATE SET
          questions_attempted = questions_attempted + excluded.questions_attempted,
          questions_correct = questions_correct + excluded.questions_correct,
          mastery_level = CAST(questions_correct + excluded.questions_correct AS REAL) /
                         (questions_attempted + excluded.questions_attempted),
          last_studied_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        body.domainId,
        body.topicId,
        topicResults.length,
        topicCorrect,
        topicCorrect / topicResults.length
      );
    }

    // TODO: Temporarily disabled - weak areas storage requires topicId in Question type
    // The identifyWeakAreas function groups by service names, not topic IDs.
    // Until questions have topicId metadata, storing weak areas would corrupt data.
    // See: https://github.com/atbrace/sa-pro-study-companion/pull/17#issuecomment-3725721464
    /*
    // Store weak areas
    for (const weakArea of result.weakAreas) {
      db.prepare(`
        INSERT INTO weak_areas (domain_id, topic_id)
        VALUES (?, ?)
        ON CONFLICT(domain_id, topic_id) DO UPDATE SET
          last_attempt_at = CURRENT_TIMESTAMP,
          attempts_since_identification = attempts_since_identification + 1
      `).run(
        body.domainId || '',
        body.topicId || weakArea.topicId
      );
    }
    */

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
