import { db } from '@/lib/db/client';

const SMOOTHING_STRENGTH = 5;
const PRIOR = 0.5;

/**
 * Apply Bayesian smoothing to observed mastery.
 * Blends observed correct/attempts ratio with a neutral prior (50%).
 * Small sample sizes are pulled toward 50%; large samples converge to raw rate.
 *
 * Formula: (correct + k * prior) / (attempts + k)
 * k=5 means 5 "virtual" attempts at 50% are added to the observation.
 *
 * @returns Mastery percentage (0-100)
 */
export function calculateSmoothedMastery(correct: number, attempts: number): number {
  const smoothed = (correct + SMOOTHING_STRENGTH * PRIOR) / (attempts + SMOOTHING_STRENGTH);
  return smoothed * 100;
}

export interface TopicMasteryResult {
  mastery: number;   // 0-100, smoothed
  attempts: number;  // count in window
  correct: number;   // correct in window
}

/**
 * Get smoothed mastery for a single topic using a sliding window
 * of the most recent 20 question attempts.
 */
export function getTopicWindowedMastery(
  examId: string,
  domainId: string,
  topicId: string
): TopicMasteryResult {
  const rows = db.prepare(`
    SELECT is_correct
    FROM question_attempts
    WHERE exam_id = ? AND domain_id = ? AND topic_id = ?
    ORDER BY attempted_at DESC
    LIMIT 20
  `).all(examId, domainId, topicId) as Array<{ is_correct: number }>;

  const attempts = rows.length;
  const correct = rows.filter(r => r.is_correct === 1).length;

  return {
    mastery: calculateSmoothedMastery(correct, attempts),
    attempts,
    correct,
  };
}

/**
 * Batch-fetch windowed mastery for ALL topics in one query.
 * Uses a window function to rank attempts per topic, then filters to last 20.
 * Returns Map keyed by "domainId/topicId" with TopicMasteryResult values.
 */
export function getAllTopicWindowedMasteries(examId: string): Map<string, TopicMasteryResult> {
  const rows = db.prepare(`
    SELECT domain_id, topic_id, is_correct, rn
    FROM (
      SELECT
        domain_id,
        topic_id,
        is_correct,
        ROW_NUMBER() OVER (
          PARTITION BY domain_id, topic_id
          ORDER BY attempted_at DESC
        ) as rn
      FROM question_attempts
      WHERE exam_id = ?
    )
    WHERE rn <= 20
  `).all(examId) as Array<{
    domain_id: string;
    topic_id: string;
    is_correct: number;
    rn: number;
  }>;

  // Group by topic
  const grouped = new Map<string, { correct: number; attempts: number }>();
  for (const row of rows) {
    const key = `${row.domain_id}/${row.topic_id}`;
    const existing = grouped.get(key) || { correct: 0, attempts: 0 };
    existing.attempts++;
    if (row.is_correct === 1) existing.correct++;
    grouped.set(key, existing);
  }

  // Calculate smoothed mastery for each topic
  const result = new Map<string, TopicMasteryResult>();
  for (const [key, stats] of grouped) {
    result.set(key, {
      mastery: calculateSmoothedMastery(stats.correct, stats.attempts),
      attempts: stats.attempts,
      correct: stats.correct,
    });
  }
  return result;
}
