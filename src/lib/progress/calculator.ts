import { cache } from "react";
import { db } from "@/lib/db/client";
import { getAllDomains, getTopicById } from "@/lib/content/loader";

export interface WeakAreaDetail {
  topicId: string;
}

export interface DomainProgress {
  domainId: string;
  domainName: string;
  weight: number;
  masteryScore: number;
  topicsCompleted: number;
  totalTopics: number;
  weakAreas: WeakAreaDetail[];
  questionsAttempted: number;
  questionsCorrect: number;
}

export interface OverallProgress {
  masteryScore: number;
  questionsAttempted: number;
  questionsCorrect: number;
  studyTimeMinutes: number;
  experimentsCompleted: number;
}

export interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
}

export interface ReadinessEstimate {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface ProgressSummary {
  overall: OverallProgress;
  domains: DomainProgress[];
  recentActivity: RecentActivity[];
  readinessEstimate: ReadinessEstimate;
}

/**
 * Get all domain mastery scores in a single query (batch optimization)
 */
function getAllDomainMasteryScores(examId: string): Map<string, number> {
  const results = db.prepare(`
    SELECT
      domain_id,
      AVG(mastery_level) as avg_mastery
    FROM topic_progress
    WHERE exam_id = ?
    GROUP BY domain_id
  `).all(examId) as Array<{ domain_id: string; avg_mastery: number | null }>;

  const masteryMap = new Map<string, number>();
  for (const result of results) {
    masteryMap.set(result.domain_id, result.avg_mastery ? result.avg_mastery * 100 : 0);
  }
  return masteryMap;
}

/**
 * Get all topic mastery scores in a single query (batch optimization for sidebar)
 * Returns Map keyed by "domainId/topicId" with mastery percentage values
 */
export function getAllTopicMasteryScores(examId: string): Map<string, number> {
  const results = db.prepare(`
    SELECT
      domain_id,
      topic_id,
      mastery_level
    FROM topic_progress
    WHERE exam_id = ?
  `).all(examId) as Array<{ domain_id: string; topic_id: string; mastery_level: number | null }>;

  const masteryMap = new Map<string, number>();
  for (const result of results) {
    const key = `${result.domain_id}/${result.topic_id}`;
    masteryMap.set(key, result.mastery_level ? result.mastery_level * 100 : 0);
  }
  return masteryMap;
}

/**
 * Get weak areas grouped by domain (batch optimization for sidebar)
 * Returns Map of domainId -> Set of topicIds that are flagged as weak
 */
export function getWeakAreasByDomain(examId: string): Map<string, Set<string>> {
  const results = db.prepare(`
    SELECT domain_id, topic_id
    FROM weak_areas
    WHERE exam_id = ? AND resolved = 0
  `).all(examId) as Array<{ domain_id: string; topic_id: string }>;

  const weakMap = new Map<string, Set<string>>();
  for (const result of results) {
    const existing = weakMap.get(result.domain_id) || new Set<string>();
    existing.add(result.topic_id);
    weakMap.set(result.domain_id, existing);
  }
  return weakMap;
}

/**
 * Calculate mastery score for a domain based on topic progress
 */
export function calculateDomainMastery(examId: string, domainId: string): number {
  const result = db.prepare(`
    SELECT
      AVG(mastery_level) as avg_mastery
    FROM topic_progress
    WHERE exam_id = ? AND domain_id = ?
  `).get(examId, domainId) as { avg_mastery: number | null };

  return result.avg_mastery ? result.avg_mastery * 100 : 0;
}

/**
 * Calculate overall mastery score weighted by domain exam weights
 * Uses batch query to avoid N+1 pattern
 */
export function calculateOverallMastery(examId: string): number {
  const domains = getAllDomains(examId);
  const masteryScores = getAllDomainMasteryScores(examId);

  let weightedSum = 0;
  let totalWeight = 0;

  for (const domain of domains) {
    const mastery = masteryScores.get(domain.meta.id) || 0;
    weightedSum += mastery * (domain.meta.weight / 100);
    totalWeight += domain.meta.weight / 100;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Get domain progress details
 * Cached per-request to avoid duplicate DB queries
 */
export const getDomainProgress = cache((examId: string, domainId: string): DomainProgress | null => {
  const domains = getAllDomains(examId);
  const domain = domains.find(d => d.meta.id === domainId);

  if (!domain) return null;

  // Get topic progress
  const topicStats = db.prepare(`
    SELECT
      COUNT(*) as topics_with_progress,
      SUM(CASE WHEN mastery_level >= 0.85 THEN 1 ELSE 0 END) as completed_topics
    FROM topic_progress
    WHERE exam_id = ? AND domain_id = ?
  `).get(examId, domainId) as { topics_with_progress: number; completed_topics: number };

  // Get question stats
  const questionStats = db.prepare(`
    SELECT
      COUNT(*) as attempted,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM question_attempts
    WHERE exam_id = ? AND domain_id = ?
  `).get(examId, domainId) as { attempted: number; correct: number };

  // Get weak areas
  const weakAreas = db.prepare(`
    SELECT DISTINCT topic_id
    FROM weak_areas
    WHERE exam_id = ? AND domain_id = ? AND resolved = 0
    ORDER BY identified_at DESC
    LIMIT 5
  `).all(examId, domainId) as Array<{ topic_id: string }>;

  // Validate that topics exist in content, filter out any that don't
  const validWeakAreas = weakAreas
    .map(w => ({ topicId: w.topic_id }))
    .filter(w => {
      const topic = getTopicById(examId, domainId, w.topicId);
      return topic !== null;
    });

  return {
    domainId: domain.meta.id,
    domainName: domain.meta.shortName,
    weight: domain.meta.weight,
    masteryScore: calculateDomainMastery(examId, domainId),
    topicsCompleted: topicStats.completed_topics || 0,
    totalTopics: domain.topics.length,
    weakAreas: validWeakAreas,
    questionsAttempted: questionStats.attempted || 0,
    questionsCorrect: questionStats.correct || 0,
  };
});

/**
 * Get overall progress statistics
 * Cached per-request to avoid duplicate DB queries
 */
export const getOverallProgress = cache((examId: string): OverallProgress => {
  const questionStats = db.prepare(`
    SELECT
      COUNT(*) as attempted,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM question_attempts
    WHERE exam_id = ?
  `).get(examId) as { attempted: number; correct: number };

  const studyTime = db.prepare(`
    SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
    FROM study_sessions
    WHERE exam_id = ?
  `).get(examId) as { total_seconds: number };

  // Experiments are now managed manually (no longer tracked in database)
  const experimentsCompleted = 0;

  return {
    masteryScore: calculateOverallMastery(examId),
    questionsAttempted: questionStats.attempted || 0,
    questionsCorrect: questionStats.correct || 0,
    studyTimeMinutes: Math.round((studyTime.total_seconds || 0) / 60),
    experimentsCompleted,
  };
});

/**
 * Get recent activity
 * Cached per-request to avoid duplicate DB queries
 */
export const getRecentActivity = cache((examId: string, limit: number = 10): RecentActivity[] => {
  const activities: RecentActivity[] = [];

  // Get recent assessments
  const assessments = db.prepare(`
    SELECT
      domain_id,
      session_type,
      score_percentage,
      completed_at
    FROM assessment_sessions
    WHERE exam_id = ?
    ORDER BY completed_at DESC
    LIMIT ?
  `).all(examId, limit) as Array<{
    domain_id: string | null;
    session_type: string;
    score_percentage: number;
    completed_at: string;
  }>;

  for (const assessment of assessments) {
    activities.push({
      type: 'assessment',
      description: assessment.domain_id
        ? `Completed ${assessment.domain_id} assessment (${Math.round(assessment.score_percentage)}%)`
        : `Completed full practice exam (${Math.round(assessment.score_percentage)}%)`,
      timestamp: assessment.completed_at,
    });
  }

  // Get recent study sessions
  const sessions = db.prepare(`
    SELECT
      domain_id,
      topic_id,
      activity_type,
      ended_at
    FROM study_sessions
    WHERE exam_id = ?
    ORDER BY ended_at DESC
    LIMIT ?
  `).all(examId, limit) as Array<{
    domain_id: string | null;
    topic_id: string | null;
    activity_type: string;
    ended_at: string;
  }>;

  for (const session of sessions) {
    activities.push({
      type: session.activity_type,
      description: session.topic_id
        ? `Studied ${session.topic_id}`
        : session.domain_id
        ? `Studied ${session.domain_id}`
        : 'Study session',
      timestamp: session.ended_at,
    });
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
});

/**
 * Calculate exam readiness estimate
 * Cached per-request to avoid duplicate DB queries
 */
export const getReadinessEstimate = cache((examId: string): ReadinessEstimate => {
  const overall = getOverallProgress(examId);
  const domains = getAllDomains(examId);

  // Check if user has attempted enough questions
  const minQuestionsPerDomain = 10;
  const totalMinQuestions = domains.length * minQuestionsPerDomain;

  if (overall.questionsAttempted < totalMinQuestions) {
    return {
      score: 0,
      confidence: 'low',
      recommendation: `Complete more assessments (${overall.questionsAttempted}/${totalMinQuestions} questions attempted)`,
    };
  }

  const masteryScore = overall.masteryScore;

  // Estimate exam score based on mastery
  // SAP-C02 passing score is ~750/1000 (75%)
  const estimatedScore = Math.round(masteryScore * 10); // Convert to 0-1000 scale

  let confidence: 'low' | 'medium' | 'high';
  let recommendation: string;

  if (masteryScore >= 85) {
    confidence = 'high';
    recommendation = 'You\'re ready! Consider scheduling your exam.';
  } else if (masteryScore >= 75) {
    confidence = 'medium';
    recommendation = 'Close to ready. Review weak areas and take more practice exams.';
  } else if (masteryScore >= 60) {
    confidence = 'medium';
    recommendation = 'Continue studying. Focus on weak domains and complete more assessments.';
  } else {
    confidence = 'low';
    recommendation = 'More preparation needed. Complete assessments for all domains and review fundamentals.';
  }

  return {
    score: estimatedScore,
    confidence,
    recommendation,
  };
});

/**
 * Batch fetch all domain progress data in optimized queries (reduces N+1)
 */
function getAllDomainProgressBatch(examId: string): DomainProgress[] {
  const domains = getAllDomains(examId);
  if (domains.length === 0) return [];

  // Batch query 1: Get mastery scores for all domains
  const masteryScores = getAllDomainMasteryScores(examId);

  // Batch query 2: Get topic stats for all domains
  const topicStatsResults = db.prepare(`
    SELECT
      domain_id,
      COUNT(*) as topics_with_progress,
      SUM(CASE WHEN mastery_level >= 0.85 THEN 1 ELSE 0 END) as completed_topics
    FROM topic_progress
    WHERE exam_id = ?
    GROUP BY domain_id
  `).all(examId) as Array<{ domain_id: string; topics_with_progress: number; completed_topics: number }>;

  const topicStatsMap = new Map<string, { topics_with_progress: number; completed_topics: number }>();
  for (const stat of topicStatsResults) {
    topicStatsMap.set(stat.domain_id, {
      topics_with_progress: stat.topics_with_progress,
      completed_topics: stat.completed_topics,
    });
  }

  // Batch query 3: Get question stats for all domains
  const questionStatsResults = db.prepare(`
    SELECT
      domain_id,
      COUNT(*) as attempted,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM question_attempts
    WHERE exam_id = ?
    GROUP BY domain_id
  `).all(examId) as Array<{ domain_id: string; attempted: number; correct: number }>;

  const questionStatsMap = new Map<string, { attempted: number; correct: number }>();
  for (const stat of questionStatsResults) {
    questionStatsMap.set(stat.domain_id, {
      attempted: stat.attempted,
      correct: stat.correct,
    });
  }

  // Batch query 4: Get weak areas for all domains
  const weakAreasResults = db.prepare(`
    SELECT domain_id, topic_id
    FROM weak_areas
    WHERE exam_id = ? AND resolved = 0
    ORDER BY identified_at DESC
  `).all(examId) as Array<{ domain_id: string; topic_id: string }>;

  // Group weak areas by domain (limit 5 per domain)
  const weakAreasMap = new Map<string, WeakAreaDetail[]>();
  for (const wa of weakAreasResults) {
    const existing = weakAreasMap.get(wa.domain_id) || [];
    if (existing.length < 5) {
      // Validate topic exists in content
      const topic = getTopicById(examId, wa.domain_id, wa.topic_id);
      if (topic) {
        existing.push({ topicId: wa.topic_id });
        weakAreasMap.set(wa.domain_id, existing);
      }
    }
  }

  // Build domain progress objects
  return domains.map(domain => {
    const domainId = domain.meta.id;
    const topicStats = topicStatsMap.get(domainId) || { topics_with_progress: 0, completed_topics: 0 };
    const questionStats = questionStatsMap.get(domainId) || { attempted: 0, correct: 0 };

    return {
      domainId,
      domainName: domain.meta.shortName,
      weight: domain.meta.weight,
      masteryScore: masteryScores.get(domainId) || 0,
      topicsCompleted: topicStats.completed_topics || 0,
      totalTopics: domain.topics.length,
      weakAreas: weakAreasMap.get(domainId) || [],
      questionsAttempted: questionStats.attempted || 0,
      questionsCorrect: questionStats.correct || 0,
    };
  });
}

/**
 * Get complete progress summary
 * Uses batch queries to avoid N+1 pattern
 * Cached per-request to deduplicate calls across components
 */
export const getProgressSummary = cache((examId: string): ProgressSummary => {
  return {
    overall: getOverallProgress(examId),
    domains: getAllDomainProgressBatch(examId),
    recentActivity: getRecentActivity(examId, 10),
    readinessEstimate: getReadinessEstimate(examId),
  };
});
