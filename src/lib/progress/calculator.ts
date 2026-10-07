import { cache } from "react";
import { db } from "@/lib/db/client";
import { getAllDomains, getTopicById } from "@/lib/content/loader";
import { MASTERY_THRESHOLD, MASTERY_THRESHOLD_DECIMAL, READINESS_APPROACHING_THRESHOLD } from "@/lib/constants";
import { getAllTopicWindowedMasteries } from './mastery';
import type { TopicMasteryResult } from './mastery';

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

export interface TopicReadiness {
  topicId: string;
  topicName: string;
  mastery: number;     // adjusted, 0-100
  attempts: number;    // in window
}

export interface DomainReadiness {
  domainId: string;
  domainName: string;
  weight: number;              // exam weight %
  mastery: number;             // coverage-aware adjusted
  topicsCovered: number;
  totalTopics: number;
  weakTopics: TopicReadiness[]; // below 85%, sorted ascending
}

export interface FocusArea {
  domainId: string;
  domainName: string;
  mastery: number;
  weight: number;
  impact: number;              // (100 - mastery) * weight/100
}

export interface ReadinessEstimate {
  score: number;                        // 0-1000
  level: 'ready' | 'approaching' | 'building';
  overallMastery: number;               // 0-100 weighted
  domainBreakdown: DomainReadiness[];
  focusAreas: FocusArea[];              // ordered by impact desc
  totalAttempts: number;
}

export interface ProgressSummary {
  overall: OverallProgress;
  domains: DomainProgress[];
  recentActivity: RecentActivity[];
  readinessEstimate: ReadinessEstimate;
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
 * Calculate overall mastery score weighted by domain exam weights
 * Uses windowed mastery calculation for consistency
 */
export function calculateOverallMastery(examId: string): number {
  const domains = getAllDomains(examId);
  const topicMasteries = getAllTopicWindowedMasteries(examId);

  let weightedSum = 0;
  let totalWeight = 0;

  for (const domain of domains) {
    const domainMastery = calculateCoverageAwareDomainMastery(
      topicMasteries, domain.meta.id, domain.topics.length
    );
    weightedSum += domainMastery * (domain.meta.weight / 100);
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
      SUM(CASE WHEN mastery_level >= ${MASTERY_THRESHOLD_DECIMAL} THEN 1 ELSE 0 END) as completed_topics
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

  const topicMasteries = getAllTopicWindowedMasteries(examId);

  return {
    domainId: domain.meta.id,
    domainName: domain.meta.shortName,
    weight: domain.meta.weight,
    masteryScore: calculateCoverageAwareDomainMastery(topicMasteries, domainId, domain.topics.length),
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
  // Query total attempts
  const { total_attempts: totalAttempts } = db.prepare(
    'SELECT COUNT(*) as total_attempts FROM question_attempts WHERE exam_id = ?'
  ).get(examId) as { total_attempts: number };

  const emptyResult: ReadinessEstimate = {
    score: 0,
    level: 'building',
    overallMastery: 0,
    domainBreakdown: [],
    focusAreas: [],
    totalAttempts,
  };

  // Minimum data gate
  if (totalAttempts < 5) {
    return emptyResult;
  }

  const domains = getAllDomains(examId);
  if (domains.length === 0) {
    return emptyResult;
  }

  const topicMasteries = getAllTopicWindowedMasteries(examId);

  // Build domain breakdown
  const domainBreakdown: DomainReadiness[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const domain of domains) {
    const domainId = domain.meta.id;
    const totalTopics = domain.topics.length;
    const domainMastery = calculateCoverageAwareDomainMastery(topicMasteries, domainId, totalTopics);

    // Count covered topics (those with attempts)
    let topicsCovered = 0;
    const weakTopics: TopicReadiness[] = [];

    for (const topic of domain.topics) {
      const key = `${domainId}/${topic.meta.id}`;
      const topicResult = topicMasteries.get(key);
      const mastery = topicResult ? topicResult.mastery : 0;
      const attempts = topicResult ? topicResult.attempts : 0;

      if (attempts > 0) {
        topicsCovered++;
      }

      // Topics below 85% are weak (including unstudied ones)
      if (mastery < MASTERY_THRESHOLD) {
        weakTopics.push({
          topicId: topic.meta.id,
          topicName: topic.meta.shortName,
          mastery,
          attempts,
        });
      }
    }

    // Sort weak topics ascending by mastery
    weakTopics.sort((a, b) => a.mastery - b.mastery);

    domainBreakdown.push({
      domainId,
      domainName: domain.meta.shortName,
      weight: domain.meta.weight,
      mastery: domainMastery,
      topicsCovered,
      totalTopics,
      weakTopics,
    });

    weightedSum += domainMastery * (domain.meta.weight / 100);
    totalWeight += domain.meta.weight / 100;
  }

  const overallMastery = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Build focus areas ordered by impact descending
  const focusAreas: FocusArea[] = domainBreakdown
    .map(d => ({
      domainId: d.domainId,
      domainName: d.domainName,
      mastery: d.mastery,
      weight: d.weight,
      impact: (100 - d.mastery) * (d.weight / 100),
    }))
    .sort((a, b) => b.impact - a.impact);

  // Determine level
  let level: 'ready' | 'approaching' | 'building';
  if (overallMastery >= MASTERY_THRESHOLD) {
    level = 'ready';
  } else if (overallMastery >= READINESS_APPROACHING_THRESHOLD) {
    level = 'approaching';
  } else {
    level = 'building';
  }

  const score = Math.round(overallMastery * 10);

  return {
    score,
    level,
    overallMastery,
    domainBreakdown,
    focusAreas,
    totalAttempts,
  };
});

/**
 * Batch fetch all domain progress data in optimized queries (reduces N+1)
 */
function getAllDomainProgressBatch(examId: string): DomainProgress[] {
  const domains = getAllDomains(examId);
  if (domains.length === 0) return [];

  // Get windowed mastery for all topics (single call, cached per-request via caller)
  const topicMasteries = getAllTopicWindowedMasteries(examId);

  // Batch query 1: Get topic stats for all domains
  const topicStatsResults = db.prepare(`
    SELECT
      domain_id,
      COUNT(*) as topics_with_progress,
      SUM(CASE WHEN mastery_level >= ${MASTERY_THRESHOLD_DECIMAL} THEN 1 ELSE 0 END) as completed_topics
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
      masteryScore: calculateCoverageAwareDomainMastery(topicMasteries, domainId, domain.topics.length),
      topicsCompleted: topicStats.completed_topics || 0,
      totalTopics: domain.topics.length,
      weakAreas: weakAreasMap.get(domainId) || [],
      questionsAttempted: questionStats.attempted || 0,
      questionsCorrect: questionStats.correct || 0,
    };
  });
}

/**
 * Calculate domain mastery with coverage awareness.
 * Divides sum of topic masteries by TOTAL topics in domain (not just studied ones).
 * Unstudied topics contribute 0, penalizing lack of breadth.
 */
export function calculateCoverageAwareDomainMastery(
  topicMasteries: Map<string, TopicMasteryResult>,
  domainId: string,
  totalTopicsInDomain: number,
): number {
  if (totalTopicsInDomain === 0) return 0;

  let masterySum = 0;
  for (const [key, result] of topicMasteries) {
    const [keyDomain] = key.split("/");
    if (keyDomain === domainId) {
      masterySum += result.mastery;
    }
  }

  return masterySum / totalTopicsInDomain;
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
